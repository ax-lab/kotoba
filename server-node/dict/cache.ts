import { now } from '../../lib'

import { Entry } from './entry'

const MAX_SEARCH_CACHE_ENTRIES = 100
const MIN_SEARCH_ENTRY_TTL_MS = 2 * 60 * 1000

export type SearchRow = {
	mode?: string
	sequence: string
	position: number
}

export class SearchCache {
	readonly id: string

	/**
	 * Returns a shared Search instace.
	 */
	static get(id: string) {
		let out = this.cache.get(id)
		if (!out) {
			this.clean_up()
			out = new SearchCache(id)
			this.cache.set(id, out)
		} else {
			out.mark_used()
		}
		return out
	}

	private time_start = 0
	private time_end = 0
	private started?: boolean
	private completed?: boolean
	private error?: Error

	private readonly row_set = new Set<string>()
	private readonly rows: Entry[] = []

	private pending: { offset: number; limit: number; callback: (rows: Entry[], error?: Error) => void }[] = []

	log(msg: string) {
		const header = `- Search '${this.id}':`
		console.log(header, msg)
	}

	/**
	 * Returns true if the operation still has not completed.
	 */
	get loading() {
		return !this.completed
	}

	/**
	 * Returns the time elapsed in this operation. For running searches this
	 * is the partial running time.
	 */
	get elapsed() {
		if (this.completed) {
			return (this.time_end - this.time_start) / 1000
		}
		if (this.started) {
			return (now() - this.time_start) / 1000
		}
		return 0
	}

	/**
	 * Return the number of rows loaded by the search. For running searches this
	 * is a partial count.
	 */
	get count() {
		return this.rows.length
	}

	/**
	 * Specifies the asynchronous operation to run this search. Only the first
	 * call to this method will execute the operation.
	 */
	start_if(callback: () => Promise<void>) {
		if (!this.started) {
			this.started = true
			this.time_start = now()
			callback()
				.catch((err) => {
					this.error = err as Error
					console.log(err)
				})
				.finally(() => {
					this.completed = true
					this.time_end = now()
					void this.solve_completed()
				})
		}
	}

	/**
	 * Filters out any existing ID from the given list.
	 */
	filter_existing(ids: string[]) {
		return ids.filter((id) => !this.row_set.has(id))
	}

	/**
	 * Calls `push` and then `solve_completed`.
	 *
	 * Returns the number of new rows added.
	 */
	async push_and_solve(rows: Entry[], args?: { allow_duplicates?: boolean }) {
		const count = this.push(rows, args)
		await this.solve_completed()
		return count
	}

	/**
	 * Append solved rows to the search results.
	 *
	 * Returns the number of new rows added.
	 */
	push(rows: Entry[], args?: { allow_duplicates?: boolean }) {
		const new_rows = args?.allow_duplicates ? rows : rows.filter((x) => !this.row_set.has(x.id))
		for (const it of new_rows) {
			this.rows.push(it)
			this.row_set.add(it.id)
		}
		return new_rows.length
	}

	/**
	 * Solve all pending operations.
	 */
	async solve_completed() {
		const solved = this.pending.filter((x) => this.completed || x.offset < this.rows.length || x.limit == 0)
		this.pending = this.pending.filter((x) => solved.indexOf(x) < 0)
		if (!solved.length) {
			return
		}

		const on_error = (err: Error) => solved.forEach((x) => x.callback([], err))

		if (!this.error) {
			try {
				for (const it of solved) {
					const rows = this.rows.slice(it.offset, it.offset + it.limit)
					it.callback(rows)
				}
			} catch (err) {
				on_error(err as Error)
			}
		} else {
			on_error(this.error)
		}
	}

	/**
	 * Asynchronously retrieve a page of the search results.
	 *
	 * Note that pending pages are only solved on a call to `flush`, regardless
	 * of the search operation being complete or not.
	 */
	async page(offset: number, limit: number) {
		return new Promise<Entry[]>((resolve, reject) => {
			this.pending.push({
				offset,
				limit,
				callback: (rows: Entry[], error?: Error) => {
					if (error) {
						reject(error)
					}
					resolve(rows)
				},
			})
		})
	}

	//#region Instance management

	private static cache = new Map<string, SearchCache>()
	private last_used: number

	/**
	 * Remove expired search entries from the shared cache.
	 */
	private static clean_up() {
		const cache = this.cache
		if (cache.size > MAX_SEARCH_CACHE_ENTRIES) {
			const candidates: string[] = []
			const now = Date.now()
			for (const [k, v] of cache) {
				const age = now - v.last_used
				if (age >= MIN_SEARCH_ENTRY_TTL_MS) {
					candidates.push(k)
				}
			}
			candidates.sort((a, b) => cache.get(a)!.last_used - cache.get(b)!.last_used)
			while (candidates.length && cache.size > MAX_SEARCH_CACHE_ENTRIES) {
				cache.delete(candidates.shift()!)
			}
		}
	}

	private constructor(id: string) {
		this.id = id
		this.last_used = Date.now()
	}

	private mark_used() {
		this.last_used = Date.now()
	}

	//#endregion
}
