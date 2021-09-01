import { now, sleep } from '../../lib'
import { EventField } from '../util/emitter'

import * as dict from './client_dict'

/**
 * Page size for EntriesQuery.
 */
const PAGE_SIZE = 50

type EntryPage = { list: dict.Entry[]; offset: number }

/**
 * This is the base class for implementing a query for word entries. It
 * manages the loading while providing paging, and caching.
 */
export abstract class Query {
	/**
	 * Descriptive name for this query (only used for debugging).
	 */
	readonly name: string

	protected constructor(name: string) {
		this.name = name
	}

	/**
	 * This must be called before disposing of the query to unregister any
	 * handlers.
	 */
	dispose() {
		clearTimeout(this._next_count_refresh)
	}

	/**
	 * Event emitted when `count`, `elapsed`, or `complete` update.
	 */
	readonly on_update = new EventField<{ count: number; elapsed: number; complete: boolean }>()

	/**
	 * Event emitted when a page of items is loaded.
	 */
	readonly on_page_loaded = new EventField<{ start: number; count: number }>()

	/**
	 * Total number of entries available in this query. This value can increase
	 * as items are loaded.
	 *
	 * See `on_count_update`.
	 */
	get count() {
		return this._count
	}

	private set count(value: number) {
		const new_count = Math.max(this._count, value)
		if (new_count != this._count) {
			this._count = new_count
			this._emit_update()
		}
	}

	/**
	 * Time elapsed on the query, when available.
	 */
	get elapsed() {
		return this._elapsed
	}

	/**
	 * Indicates if the query is complete on the backend.
	 *
	 * In practice, this means that the `count` and `elapsed` values are the
	 * final ones.
	 */
	get complete() {
		return this._is_count_complete == true
	}

	private _count = 0
	private _elapsed = 0
	private _pages = new Map<number, EntryPage>()

	private _is_count_complete = false
	private _next_count_refresh = -1

	/**
	 * Return the item at the given index or `null` if it is not available.
	 *
	 * Note that this does not trigger a page load (see `prefetch`).
	 */
	get(index: number): dict.Entry | null {
		if (index < 0 || index >= this._count) {
			return null
		}

		const page = this._pages.get(Math.floor(index / PAGE_SIZE))
		if (page) {
			return page.list[index - page.offset] || null
		}

		return null
	}

	private readonly _last_fetch = { start: -1, count: -1, time: 0 }

	/**
	 * Requests a range of entries to be loaded, if they are not available yet.
	 *
	 * Note that entries are always loaded in pages, so all unloaded pages in
	 * the given range will be queued for loading.
	 *
	 * If `count` is not given, only the page of the `start` item will be queued
	 * for loading.
	 *
	 * If `cancel_pending` is true, this will clear the load queue, so any
	 * pages that have not started to load will be cancelled.
	 */
	prefetch(args: { start: number; count?: number; cancel_pending?: boolean }) {
		const start = args.start
		const count = args.count || 1

		const t = now()
		if (t - this._last_fetch.time < 5 && start == this._last_fetch.start && count == this._last_fetch.count) {
			return
		}

		this._last_fetch.time = t
		this._last_fetch.start = start
		this._last_fetch.count = count

		const sta = Math.floor(Math.max(0, start) / PAGE_SIZE)
		const end = Math.max(sta, Math.floor((start + count) / PAGE_SIZE))

		console.log('FETCH', start, count, sta, end)

		if (args.cancel_pending) {
			this._load_queue.length = 0
			this._load_queued.clear()
			for (const cancel_fn of this._load_pending.values()) {
				cancel_fn()
			}
		}

		for (let page = sta; page <= end; page++) {
			const current = this._pages.get(page)
			if (!current || this._is_incomplete(current)) {
				if (!this._load_pending.has(page) && !this._load_queued.has(page)) {
					this._load_queue.push({ page: page })
					this._load_queued.add(page)
				}
			}
		}

		this._flush_queue()
	}

	//------------------------------------------------------------------------//
	// Derived classes
	//------------------------------------------------------------------------//

	/**
	 * Returns the maximum number of fetch operations to do in parallel for this
	 * query.
	 */
	protected abstract maximum_fetch_operations(): number

	/**
	 * This is the loading operation that must be implemented by derived
	 * classes.
	 *
	 * `offset` is a positive index starting from zero with the desired offset
	 * in the query results.
	 *
	 * `limit` is a positive count of the maximum number of entries that are
	 * expected to be be loaded, starting from `offset`. The operation is free
	 * to return less items, including zero, regardless of how many items are
	 * actually available.
	 *
	 * Note that `limit` can also be zero, if the operation is only requesting
	 * an update on the count.
	 *
	 * The result of the operation is a list of entries starting at the given
	 * offset, an updated total `count`, and a `complete` flag.
	 *
	 * - The `complete` flag indicates if the query finished loading in the
	 *   backend. This is used to refresh the count.
	 * - The list of entries can be of any size, including zero, but must
	 *   correspond to the given `offset`.
	 * - The total `count` is expected to increase as items are loaded by the
	 *   backend, so when fetch operations return different `count` values only
	 *   the maximum is kept.
	 * - The list of entries is also considered when updating the total `count`.
	 */
	protected abstract fetch_entries(
		offset: number,
		limit: number,
	): Promise<{ count: number; list: dict.Entry[]; complete: boolean; elapsed?: number }>

	//------------------------------------------------------------------------//
	// Private
	//------------------------------------------------------------------------//

	/**
	 * Map page index to a cancellation function for pending page loads.
	 */
	private readonly _load_pending = new Map<number, () => void>()

	/**
	 * Flag
	 */
	private readonly _load_queued = new Set<number>()
	private readonly _load_queue: Array<{ page: number }> = []

	private _is_incomplete(page?: EntryPage) {
		return !page || (page.list.length < PAGE_SIZE && page.offset + page.list.length < this._count)
	}

	private _flush_queue() {
		const max_parallel = Math.max(1, this.maximum_fetch_operations())
		while (this._load_pending.size < max_parallel && this._load_queue.length) {
			const { page } = this._load_queue.shift()!
			const cancel = { cancelled: false }
			this._load_queued.delete(page)
			this._load_pending.set(page, () => (cancel.cancelled = true))
			void this._load_page(page, cancel)
		}
	}

	private async _load_page(page_index: number, cancel: { cancelled: boolean }) {
		try {
			let delay_ms = 100
			while (true) {
				// Delay any pending refresh since we are loading a page.
				this._queue_refresh_count()

				if (cancel.cancelled) {
					return
				}

				const page = this._pages.get(page_index)
				if (page && !this._is_incomplete(page)) {
					return
				}

				const sta = page_index * PAGE_SIZE
				const end = Math.min(this._count, sta + PAGE_SIZE)
				const offset = sta + (page ? page.list.length : 0)
				const limit = end == this._count ? PAGE_SIZE : end - offset

				const { count, list, elapsed, complete } = await this.fetch_entries(offset, limit)
				this.count = Math.max(count, list.length ? offset + list.length : 0)

				// If the query is reported as complete, flag the count as
				// complete and cancel any pending refreshes.
				if (complete) {
					this._is_count_complete = true
					this._queue_refresh_count()
				}

				this._elapsed = Math.max(this._elapsed, elapsed || 0)

				this._emit_update()

				const new_page = page || { list: [], offset }
				if (!page) {
					this._pages.set(page_index, new_page)
				}
				new_page.list.push(...list)
				if (new_page.list.length > PAGE_SIZE) {
					new_page.list.length = PAGE_SIZE
				}

				if (list.length) {
					setTimeout(() => this.on_page_loaded.emit({ start: offset, count: list.length }), 0)
				}

				if (this._is_incomplete(new_page)) {
					await sleep(delay_ms, cancel)
					delay_ms = Math.min(500, delay_ms * 2)
				}
			}
		} catch (err) {
			console.error(`${this.name}: loading page ${page_index}`, err)
		} finally {
			this._load_pending.delete(page_index)
			this._flush_queue()
		}
	}

	private _pending_update = -1

	private _emit_update() {
		clearTimeout(this._pending_update)
		this._pending_update = (setTimeout(() => {
			this.on_update.emit({ count: this.count, complete: this.complete, elapsed: this.elapsed })
		}, 0) as unknown) as number
	}

	private _refresh_count_timeout = 250
	private _refresh_count_retries = 10

	private _queue_refresh_count() {
		clearTimeout(this._next_count_refresh)
		if (this._is_count_complete || this._refresh_count_retries == 0) {
			return // no need to update the count anymore
		}

		this._next_count_refresh = (setTimeout(() => {
			this.fetch_entries(0, 0)
				.then(({ count, complete }) => {
					this.count = count
					if (complete) {
						this._is_count_complete = true
					} else {
						this._queue_refresh_count()
					}
					this._emit_update()
				})
				.catch((err) => {
					console.error(`${this.name} - refresh count failed`, err)
					this._refresh_count_timeout = Math.min(1000, this._refresh_count_timeout * 2)
					this._refresh_count_retries--
					this._queue_refresh_count()
				})
		}, this._refresh_count_timeout) as unknown) as number
	}
}

class QueryAll extends Query {
	constructor() {
		super('all entries')
	}

	maximum_fetch_operations() {
		return 3
	}

	async fetch_entries(offset: number, limit: number) {
		const data = await dict.words({ offset, limit })
		return { complete: true, ...data }
	}
}

class QuerySearch extends Query {
	readonly text: string

	constructor(search_text: string) {
		super(`search "${search_text}"`)
		this.text = search_text
	}

	maximum_fetch_operations() {
		return 1
	}

	async fetch_entries(offset: number, limit: number) {
		const result = await dict.search(this.text, { offset, limit })
		return { count: result.total, list: result.page.entries, elapsed: result.elapsed, complete: !result.loading }
	}
}

const query_all = new QueryAll()

export function all(): Query {
	return query_all
}

export function search(text: string) {
	return new QuerySearch(text)
}
