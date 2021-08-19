import { elapsed, kana, now } from '../../lib'
import { group_by } from '../../lib/list'

import DB from './db'
import * as query from './query'
import * as table from './table'
import * as tags from './tags'

function split(ls: string): string[] {
	return ls ? ls.split('||') : []
}

async function entries_by_ids(ids: string[]) {
	if (!ids.length) {
		return []
	}

	const sequences = ids
		.filter((x) => /^\d+$/.test(x))
		.map((x) => `'${x}'`)
		.join(', ')
	const condition = `sequence IN (${sequences})`

	const dict = await DB.get_dict()
	const rows = dict.query<table.Entry>(`SELECT * FROM entries WHERE ${condition}`)
	const kanji = dict.query<table.EntryKanji>(`SELECT * FROM entries_kanji WHERE ${condition}`)
	const reading = dict.query<table.EntryReading>(`SELECT * FROM entries_reading WHERE ${condition}`)
	const sense = dict.query<table.EntrySense>(`SELECT * FROM entries_sense WHERE ${condition}`)
	const glossary = dict.query<table.EntrySenseGlossary>(`SELECT * FROM entries_sense_glossary WHERE ${condition}`)
	const source = dict.query<table.EntrySenseSource>(`SELECT * FROM entries_sense_source WHERE ${condition}`)
	const all_tags = await tags.all()

	const kanji_map = group_by(
		(await kanji).map((row) => {
			const out = {
				expr: row.expr,
				info: tags.split(row.info, all_tags),
				priority: tags.split(row.priority, all_tags),
				popular: !!row.popular,
			}
			return { key: row.sequence, val: out }
		}),
		(row) => [row.key, row.val],
	)

	const reading_map = group_by(
		(await reading).map((row) => {
			const out = {
				expr: row.expr,
				no_kanji: !!row.no_kanji,
				restrict: split(row.restrict),
				info: tags.split(row.info, all_tags),
				popular: !!row.popular,
				priority: tags.split(row.priority, all_tags),
				pitches: parse_pitch(row.pitches, all_tags),
			}
			return { key: row.sequence, val: out }
		}),
		(row) => [row.key, row.val],
	)

	const sense_map = group_by(
		(await sense).map((row) => {
			const out = {
				stag_kanji: split(row.stag_kanji),
				stag_reading: split(row.stag_reading),
				pos: tags.split(row.part_of_speech, all_tags),
				xref: split(row.xref),
				antonym: split(row.antonym),
				field: tags.split(row.field, all_tags),
				misc: tags.split(row.misc, all_tags),
				info: split(row.info),
				dialect: tags.split(row.dialect, all_tags),
				source: [],
				glossary: [],
				$pos: row.pos,
			}
			return { key: row.sequence, val: out }
		}),
		(row) => [row.key, row.val],
	)

	const source_map = group_by(
		(await source).map((row) => {
			const out = {
				$pos: row.pos,
				text: row.text,
				lang: row.lang,
				partial: !!row.partial,
				wasei: !!row.wasei,
			}
			return { key: row.sequence, val: out }
		}),
		(row) => [row.key, row.val],
	)

	const glossary_map = group_by(
		(await glossary).map((row) => {
			const out = {
				$pos: row.pos,
				text: row.text,
				type: row.type,
			}
			return { key: row.sequence, val: out }
		}),
		(row) => [row.key, row.val],
	)

	const entries = (await rows).map((row) => {
		const out = new Entry(row, kanji_map, reading_map, sense_map, source_map, glossary_map)
		return out
	})

	const entries_map = new Map(entries.map((x) => [x.id, x]))
	const out = ids.map((x) => entries_map.get(x)!).filter((x) => !!x)
	return out
}

export class Entry {
	readonly id: string
	readonly rank: number | null
	readonly position: number | null
	readonly frequency: number | null
	readonly jlpt: number | null
	readonly popular: boolean
	readonly kanji: EntryKanji[]
	readonly reading: EntryReading[]
	readonly sense: EntrySense[]

	match_mode?: string

	constructor(
		row: table.Entry,
		kanji_map: Map<string, EntryKanji[]>,
		reading_map: Map<string, EntryReading[]>,
		sense_map: Map<string, EntrySense[]>,
		source_map: Map<string, EntrySenseSource[]>,
		glossary_map: Map<string, EntrySenseGlossary[]>,
	) {
		const sources = source_map.get(row.sequence) || []
		const glossaries = glossary_map.get(row.sequence) || []
		;(this.id = row.sequence),
			(this.rank = row.rank),
			(this.position = row.position),
			(this.frequency = row.frequency),
			(this.jlpt = row.jlpt),
			(this.popular = !!row.popular),
			(this.kanji = kanji_map.get(row.sequence) || []),
			(this.reading = reading_map.get(row.sequence) || []),
			(this.sense = (sense_map.get(row.sequence) || []).map((row) => ({
				...row,
				source: sources.filter((x) => x.$pos == row.$pos),
				glossary: glossaries.filter((x) => x.$pos == row.$pos),
			})))
	}

	word() {
		return this.kanji.length ? this.kanji[0].expr : this.reading[0].expr
	}

	read() {
		return this.reading[0].expr
	}

	text() {
		return this.sense.map((x) => x.glossary.map((x) => x.text).join(', ')).join(' | ')
	}
}

export type EntryKanji = { expr: string; info: tags.Tag[]; priority: tags.Tag[]; popular: boolean }
export type EntryReading = {
	expr: string
	no_kanji: boolean
	restrict: string[]
	info: tags.Tag[]
	popular: boolean
	priority: tags.Tag[]
	pitches: { value: number; tags: tags.Tag[] }[]
}
export type EntrySense = {
	stag_kanji: string[]
	stag_reading: string[]
	pos: tags.Tag[]
	xref: string[]
	antonym: string[]
	field: tags.Tag[]
	misc: tags.Tag[]
	info: string[]
	dialect: tags.Tag[]
	$pos: number
	source: EntrySenseSource[]
	glossary: EntrySenseGlossary[]
}
export type EntrySenseSource = { $pos: number; text: string; lang: string; partial: boolean; wasei: boolean }
export type EntrySenseGlossary = { $pos: number; text: string; type: string }

export async function word_count() {
	const dict = await DB.get_dict()
	const rows = await dict.query<{ count: number }>(`SELECT COUNT(*) AS count FROM entries`)
	return rows[0].count
}

export async function words(args: { offset?: number; limit?: number }) {
	const offset = Math.max(0, Math.round(args.offset || 0))
	const limit = Math.max(0, Math.round(args.limit || 100))
	const dict = await DB.get_dict()

	// Adding position to this query forces SQLite to use a table scan instead
	// of a index scan, preserving the natural order of the table without using
	// an ORDER BY (which would cause a full table scan).
	const rows = await dict.query<{ sequence: string }>(
		`SELECT sequence, position FROM entries LIMIT ${limit} OFFSET ${offset}`,
	)
	const ids = rows.map((x) => x.sequence)
	const entries = await entries_by_ids(ids)
	return entries
}

export async function by_id(args: { id: string }) {
	return (await entries_by_ids([args.id])).shift()
}

export async function by_ids(args: { ids: string[] }) {
	return await entries_by_ids(args.ids)
}

export async function lookup({ kanji, reading }: { kanji: string; reading: string }) {
	const has_kanji = kanji && kanji != reading
	const kanji_where = has_kanji ? '= ?' : 'IS NULL'
	const args = has_kanji ? [kanji, reading] : [reading]
	const dict = await DB.get_dict()
	const rows = await dict.query<{ sequence: string }>(
		`
		SELECT DISTINCT e.sequence FROM entries e
		LEFT JOIN entries_kanji k ON e.sequence = k.sequence
		LEFT JOIN entries_reading r ON e.sequence = r.sequence
		WHERE k.expr ${kanji_where} AND r.expr = ?
	`,
		args,
	)
	const ids = rows.map((x) => x.sequence)
	const entries = await entries_by_ids(ids)
	if (entries.length > 1) {
		return entries.filter((x) => {
			if (has_kanji && (!x.kanji.length || x.kanji[0].expr != kanji)) {
				return false
			}
			if (x.reading[0].expr != reading) {
				return false
			}
			return true
		})
	}
	return entries
}

function parse_pitch(input: string, all_tags: tags.Tag[]) {
	if (!input) {
		return []
	}
	return input.split(';').map((x) => {
		const [num, val] = x.split(':')
		return { value: parseInt(num, 10), tags: tags.split(val, all_tags) }
	})
}

//============================================================================//
// Search
//============================================================================//

/**
 * Advanced search for entries. For details on the syntax and behavior see
 * the GraphQL documentation in `graph.ts`.
 */
export async function search(args: { id: string; query: string }) {
	const start = now()

	const parsed = query.parse(args.query)

	// Get a cached search instance if any. This will create a new instance if
	// none is available.
	const cache = parsed && Search.get(parsed.id)

	// The first time 'search' is called (or if a previous instance has been
	// purged from the cache) this will run to execute the search.
	parsed &&
		cache &&
		cache.start_if(async () => {
			const db = await DB.get_dict()
			const t0 = now()

			// We incrementally load rows as defined by the search precedence. The
			// reason for splitting the search between multiple SQL queries is to
			// solve pages as soon as possible. This guarantees that even on heavy
			// searches, the first matches will still be fast.
			const ops = [
				{ mode: 'exact', name: 'exact match', sql: parsed.exact_match },
				{ mode: 'prefix', name: 'exact prefix', sql: parsed.exact_prefix },
				{ mode: 'suffix', name: 'exact suffix', sql: parsed.exact_suffix },
				{ mode: 'contains', name: 'exact contains', sql: parsed.exact_contains },
				{ mode: 'approx', name: 'approx match', sql: parsed.approx_match },
				{ mode: 'approx-prefix', name: 'approx prefix', sql: parsed.approx_prefix },
				{ mode: 'approx-suffix', name: 'approx suffix', sql: parsed.approx_suffix },
				{ mode: 'approx-contains', name: 'approx contains', sql: parsed.approx_contains },
				{ mode: 'fuzzy', name: 'fuzzy match', sql: parsed.fuzzy_match },
				{ mode: 'fuzzy-prefix', name: 'fuzzy prefix', sql: parsed.fuzzy_prefix },
				{ mode: 'fuzzy-suffix', name: 'fuzzy suffix', sql: parsed.fuzzy_suffix },
				{ mode: 'fuzzy-contains', name: 'fuzzy contains', sql: parsed.fuzzy_contains },
			]

			let count = 0
			for (const { mode, name, sql } of ops) {
				if (!sql) {
					continue
				}

				const t0 = now()
				const rows = await db.query<SearchRow>(sql)
				count += rows.length
				cache.log(`${name} - loaded ${rows.length} rows in ${elapsed(t0)}`)
				cache.push(mode, rows)

				// This will trigger any completed pages to be solved. In particular,
				// first pages (offset = 0) will be solved as long as any row has been
				// loaded. We want pages going out as soon as any data is available.
				//
				// This is blocking, which also has the secondary benefit of waiting
				// until the individual entries have been loaded from the SQLite DB
				// before continuing the query (we don't cache entire rows to conserve
				// memory). Otherwise, our heavy searches would negatively affect
				// entry load performance and impact the response time.
				await cache.solve_completed()
			}

			cache.log(`search completed in ${elapsed(t0)}`)
			cache.log(`found ${cache.count} unique entries from ${count} rows`)
		})

	// This is used to synchronize the information fields for search results so
	// we'll wait for after the pages have been loaded to get the information.
	const pages: Promise<unknown>[] = []
	const sync = new Promise<void>((resolve) => {
		// Wait for the next tick and resolve to a new promise that will wait
		// on all pages. This relies on the GraphQL library calling all `page`
		// fields synchronously as soon as the `search` function returns.
		process.nextTick(() =>
			resolve(
				Promise.all(pages).then(() => {
					return
				}),
			),
		)
	})

	cache && process.nextTick(() => cache.solve_completed())

	return {
		id: args.id || args.query,

		// Informational fields will wait on all pages to provide the most
		// up-to-date result at the time the search returns.
		async total() {
			await sync
			return cache ? cache.count : 0
		},
		async elapsed() {
			await sync
			return cache ? cache.elapsed : 0
		},
		async loading() {
			await sync
			console.log(`GraphQL: search "${args.query}" took ${elapsed(start)} to resolve`)
			return cache ? cache.loading : false
		},

		// Retrieves a page from the results.
		page({ offset, limit }: { offset?: number; limit?: number } = {}) {
			if (offset == null || offset < 0) {
				throw new Error(`invalid offset (${offset})`)
			}
			if (!limit || limit <= 0) {
				throw new Error(`invalid limit (${limit})`)
			}

			const load = (async () => {
				const entries = cache ? await cache.page(offset, limit) : []
				return {
					offset,
					limit,
					entries,
				}
			})()

			pages.push(load)
			return load
		},
	}
}

const MAX_SEARCH_CACHE_ENTRIES = 100
const MIN_SEARCH_ENTRY_TTL_MS = 2 * 60 * 1000

type SearchRow = {
	mode?: string
	sequence: string
	position: number
}

class Search {
	readonly id: string

	/**
	 * Returns a shared Search instace.
	 */
	static get(id: string) {
		let out = this.cache.get(id)
		if (!out) {
			this.clean_up()
			out = new Search(id)
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

	private row_map = new Map<string, SearchRow>()
	private rows: SearchRow[] = []

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
				.catch((err) => (this.error = err as Error))
				.finally(() => {
					this.completed = true
					this.time_end = now()
					void this.solve_completed()
				})
		}
	}

	/**
	 * Append solved rows to the search results.
	 */
	push(mode: string, rows: SearchRow[]) {
		const new_rows = rows.filter((x) => !this.row_map.has(x.sequence)).map((x) => ({ ...x, mode }))
		this.rows.push(...new_rows)
		for (const it of new_rows) {
			this.row_map.set(it.sequence, it)
		}
	}

	/**
	 * Solve all pending operations.
	 */
	async solve_completed() {
		const solved = this.pending.filter((x) => this.completed || x.offset < this.rows.length)
		this.pending = this.pending.filter((x) => solved.indexOf(x) < 0)
		if (!solved.length) {
			return
		}

		const on_error = (err: Error) => solved.forEach((x) => x.callback([], err))

		if (!this.error) {
			const ids = new Set(
				solved.flatMap((x) => this.rows.slice(x.offset, x.offset + x.limit).map((x) => x.sequence)),
			)
			const start = now()
			try {
				const all_rows = new Map((await entries_by_ids(Array.from(ids.values()))).map((x) => [x.id, x]))
				for (const it of solved) {
					const rows = this.rows
						.slice(it.offset, it.offset + it.limit)
						.map((x) => all_rows.get(x.sequence)!)
						.filter((x) => {
							const row = this.row_map.get(x.id)
							if (x && row) {
								x.match_mode = row.mode
							}
							return !!x
						})
					it.callback(rows)
				}
				this.log(`solved ${ids.size} row(s) / ${solved.length} page(s) in ${elapsed(start)}`)
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

	private static cache = new Map<string, Search>()
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

//============================================================================//
// Listing
//============================================================================//

type ListArgs = {
	approx?: boolean
	fuzzy?: boolean
	limit?: number
	offset?: number
}

export async function list(args: { keyword: string }) {
	const search = ListByKeyword.get(args.keyword)
	return {
		async exact() {
			const rows = await search.exact()
			return await entries_by_ids(rows.map((x) => x.sequence))
		},
		async matches(args: ListArgs) {
			const rows = await search.matches(args)
			return await entries_by_ids(rows.map((x) => x.sequence))
		},
		async prefix(args: ListArgs) {
			const rows = await search.prefix(args)
			return await entries_by_ids(rows.map((x) => x.sequence))
		},
		async suffix(args: ListArgs) {
			const rows = await search.suffix(args)
			return await entries_by_ids(rows.map((x) => x.sequence))
		},
		async contains(args: ListArgs) {
			const rows = await search.contains(args)
			return await entries_by_ids(rows.map((x) => x.sequence))
		},
	}
}

/**
 * Encapsulate a running or cached search with its results. Provide methods
 * to trigger the search and wait on the results.
 */
class ListByKeyword {
	readonly keyword: string
	readonly hiragana: string

	//#region Instance management

	/**
	 * Returns an instance of `Search` for the given keyword.
	 */
	static get(keyword: string) {
		keyword = keyword.trim().toUpperCase().replace(/\s+/, ' ')
		let out = this.cache.get(keyword)
		if (!out) {
			this.clean_up()
			out = new ListByKeyword(keyword)
			this.cache.set(keyword, out)
		}

		return out
	}

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

	private static cache = new Map<string, ListByKeyword>()

	private last_used: number

	private constructor(keyword: string) {
		this.keyword = keyword
		this.hiragana = kana.to_hiragana(keyword)
		this.last_used = Date.now()
	}

	private mark_used() {
		this.last_used = Date.now()
	}

	//#endregion

	//#region Search keys

	private _approx?: string
	private _approx_rev?: string
	private _hiragana_rev?: string

	private get approx() {
		this._approx ||= kana.to_hiragana_key(this.keyword)
		return this._approx
	}

	private get approx_rev() {
		this._approx_rev ||= [...this.approx].reverse().join('')
		return this._approx_rev
	}

	private get hiragana_rev() {
		this._hiragana_rev ||= [...this.hiragana].reverse().join('')
		return this._hiragana_rev
	}

	//#endregion

	/**
	 * Searches for exact matches on the keyword and returns them in order of
	 * relevance.
	 *
	 * This is a very fast lookup. Not many results are expected for any
	 * given query, so no pagination is provided.
	 *
	 * This will match on both kanji and reading elements. The keyword will be
	 * matched exactly and also converted to hiragana before matching.
	 */
	async exact() {
		const sql = [
			'SELECT DISTINCT m.sequence, e.position',
			'FROM entries_map m',
			'LEFT JOIN entries e ON e.sequence = m.sequence',
			'WHERE (m.expr LIKE ? OR m.hiragana LIKE ?)',
			'ORDER BY length(m.expr), e.position',
		].join('\n')

		this.mark_used()
		return this.search_rows('exact', {
			sql,
			params: [this.keyword, this.hiragana],
		})
	}

	/**
	 * Performs a match search. This matches the entire word, but differs from
	 * `exact` in that it allows approximate and fuzzy matching.
	 *
	 * If `approx` is true this will perform the match using a key that
	 * approximates the keyword (see `prefix` for details).
	 *
	 * Enabling `fuzzy` works similarly to `prefix` but thee entry must match
	 * the first and last characters at least.
	 */
	async matches(args: ListArgs) {
		this.mark_used()
		this.validate_args(args)

		const params: Record<string, string> = {
			k: this.keyword,
			h: this.hiragana,
		}
		const sql = [
			`SELECT DISTINCT m.sequence, e.position FROM (`,
			`  SELECT expr, sequence, 1 AS pos FROM entries_map WHERE expr LIKE @k OR hiragana LIKE @h`,
		]

		if (args.approx || args.fuzzy) {
			params['a'] = this.approx
			sql.push(
				...[
					// Approximate search
					`  UNION ALL`,
					`  SELECT expr, sequence, 2 AS pos FROM entries_map WHERE keyword LIKE @a`,
				],
			)
		}

		if (args.fuzzy) {
			params['f'] = [...this.approx].join('%')
			sql.push(
				...[
					// Fuzzy search
					`  UNION ALL`,
					`  SELECT expr, sequence, 3 AS pos FROM entries_map WHERE keyword LIKE @f`,
				],
			)
		}

		sql.push(
			...[`) m LEFT JOIN entries e ON e.sequence = m.sequence`, `ORDER BY m.pos, length(m.expr), e.position`],
		)

		const id = 'match-' + (args.fuzzy ? 'fuzzy' : args.approx ? 'approx' : 'exact')

		return this.search_rows(id, { ...args, sql: sql.join('\n'), params })
	}

	/**
	 * Performs a prefix search.
	 *
	 * If `approx` is true this will perform the prefix search using a key that
	 * approximates the keyword in a way that normalizes small differences
	 * between words (e.g. typos, hearing mistakes, etc.).
	 *
	 * Enabling `fuzzy` implies enabling `approx` and will go one step further
	 * by matching fragments. The first letter must still match, but as long as
	 * all fragments of the prefix occur in keyword in order the match will be
	 * valid.
	 *
	 * Note that prefix matching can be quite slow on small prefixes or with
	 * fuzzy enabled.
	 */
	async prefix(args: ListArgs) {
		this.mark_used()
		this.validate_args(args)

		const params: Record<string, string> = {
			k: this.keyword,
			h: this.hiragana,
			kp: this.keyword + '%',
			hp: this.hiragana + '%',
		}
		const sql = [
			`SELECT DISTINCT m.sequence, e.position FROM (`,
			`  SELECT expr, sequence, 1 AS pos FROM entries_map WHERE expr LIKE @kp OR hiragana LIKE @hp`,
		]

		if (args.approx || args.fuzzy) {
			params['a'] = this.approx + '%'
			sql.push(
				...[
					// Approximate search
					`  UNION ALL`,
					`  SELECT expr, sequence, 2 AS pos FROM entries_map WHERE keyword LIKE @a`,
				],
			)
		}

		if (args.fuzzy) {
			params['f'] = [...this.approx].join('%') + '%'
			sql.push(
				...[
					// Fuzzy search
					`  UNION ALL`,
					`  SELECT expr, sequence, 3 AS pos FROM entries_map WHERE keyword LIKE @f`,
				],
			)
		}

		sql.push(
			...[
				`) m LEFT JOIN entries e ON e.sequence = m.sequence`,
				`WHERE m.sequence NOT IN (`,
				`  SELECT sequence FROM entries_map WHERE expr LIKE @k OR hiragana LIKE @h`,
				`) ORDER BY m.pos, length(m.expr), e.position`,
			],
		)

		const id = 'prefix-' + (args.fuzzy ? 'fuzzy' : args.approx ? 'approx' : 'exact')

		return this.search_rows(id, { ...args, sql: sql.join('\n'), params })
	}

	/**
	 * Performs a suffix search. This is exactly the same as `prefix` but
	 * matches from the end of the keyword.
	 *
	 * The performance characteristics are also the same as `prefix`.
	 */
	async suffix(args: ListArgs) {
		this.mark_used()
		this.validate_args(args)

		const params: Record<string, string> = {
			k: this.keyword,
			h: this.hiragana,
			hr: this.hiragana_rev + '%',
		}
		const sql = [
			`SELECT DISTINCT m.sequence, e.position FROM (`,
			`  SELECT expr, sequence, 1 AS pos FROM entries_map WHERE hiragana_rev LIKE @hr`,
		]

		if (args.approx || args.fuzzy) {
			params['a'] = this.approx_rev + '%'
			sql.push(
				...[
					// Approximate search
					`  UNION ALL`,
					`  SELECT expr, sequence, 2 AS pos FROM entries_map WHERE keyword_rev LIKE @a`,
				],
			)
		}

		if (args.fuzzy) {
			params['f'] = [...this.approx_rev].join('%') + '%'
			sql.push(
				...[
					// Fuzzy search
					`  UNION ALL`,
					`  SELECT expr, sequence, 3 AS pos FROM entries_map WHERE keyword_rev LIKE @f`,
				],
			)
		}

		sql.push(
			...[
				`) m LEFT JOIN entries e ON e.sequence = m.sequence`,
				`WHERE m.sequence NOT IN (`,
				`  SELECT sequence FROM entries_map WHERE expr LIKE @k OR hiragana LIKE @h`,
				`) ORDER BY m.pos, length(m.expr), e.position`,
			],
		)

		const id = 'suffix-' + (args.fuzzy ? 'fuzzy' : args.approx ? 'approx' : 'exact')

		return this.search_rows(id, { ...args, sql: sql.join('\n'), params })
	}

	/**
	 * Performs a "contains" search. This is by far the slowest since it
	 * requires a table scan.
	 *
	 * The arguments have the same meaning as in the `prefix` search.
	 */
	async contains(args: ListArgs) {
		this.mark_used()
		this.validate_args(args)

		const params: Record<string, string> = {
			k: this.keyword,
			h: this.hiragana,
			kp: this.keyword + '%',
			hp: this.hiragana + '%',
			hs: this.hiragana_rev + '%',
			kx: '%' + this.keyword + '%',
			hx: '%' + this.hiragana + '%',
		}
		const sql = [
			`SELECT DISTINCT m.sequence, e.position FROM (`,
			`  SELECT expr, sequence, 1 AS pos FROM entries_map WHERE expr LIKE @kx OR hiragana LIKE @hx`,
		]

		if (args.approx || args.fuzzy) {
			params['a'] = '%' + this.approx + '%'
			sql.push(
				...[
					// Approximate search
					`  UNION ALL`,
					`  SELECT expr, sequence, 2 AS pos FROM entries_map WHERE keyword LIKE @a`,
				],
			)
		}

		if (args.fuzzy) {
			params['f'] = '%' + [...this.approx].join('%') + '%'
			sql.push(
				...[
					// Fuzzy search
					`  UNION ALL`,
					`  SELECT expr, sequence, 3 AS pos FROM entries_map WHERE keyword LIKE @f`,
				],
			)
		}

		sql.push(
			...[
				`) m LEFT JOIN entries e ON e.sequence = m.sequence`,
				`WHERE m.sequence NOT IN (`,
				`  SELECT sequence FROM entries_map WHERE expr LIKE @k OR hiragana LIKE @h`,
				`  UNION ALL`,
				`  SELECT sequence FROM entries_map WHERE expr LIKE @kp OR hiragana LIKE @hp`,
				`  UNION ALL`,
				`  SELECT sequence FROM entries_map WHERE hiragana_rev LIKE @hs`,
				`) ORDER BY m.pos, length(m.expr), e.position`,
			],
		)

		const id = 'contains-' + (args.fuzzy ? 'fuzzy' : args.approx ? 'approx' : 'exact')

		return this.search_rows(id, { ...args, sql: sql.join('\n'), params })
	}

	private operations = new Map<string, SearchOp>()

	/**
	 * Raw search implementation. This takes a unique operation key, setup
	 * configuration, and paging arguments.
	 *
	 * Returns a promise that will be resolved once data is loaded with the
	 * given offset/limit range.
	 *
	 * The first time this method is called, it will initiate the given search
	 * operation in the background. Further search requests with the same id
	 * will share the same operation.
	 *
	 * A request for an operation that has already been completed is resolved
	 * immediately.
	 */
	private async search_rows(id: string, args: { sql: string; params: unknown; offset?: number; limit?: number }) {
		const op =
			this.operations.get(id) ||
			((op: SearchOp) => {
				this.operations.set(id, op)
				return op
			})(new SearchOp(`${this.keyword} (${id})`))
		if (!op.started) {
			op.started = true
			void (async () => {
				try {
					const db = await DB.get_dict()
					const rows = await db.query<SearchRow>(args.sql, args.params)
					op.rows = rows
					op.complete()
				} catch (err) {
					op.complete(err as Error)
				}
			})()
		}

		const paged = args.offset != null
		const offset = args.offset || 0
		const limit = args.limit

		return new Promise<SearchRow[]>((resolve, reject) => {
			op.add_pending({ paged, offset, limit, resolve, reject })
		})
	}

	private validate_args(args: ListArgs) {
		if (args.offset) {
			if (args.offset < 0) {
				throw new Error('invalid offset')
			}
		}
		if (args.limit) {
			if (args.limit < 1) {
				throw new Error('invalid limit')
			}
		}
	}
}

class SearchOp {
	readonly name: string
	readonly start: number

	rows: SearchRow[] = []
	error?: Error
	is_complete?: boolean
	started?: boolean
	pending: SearchCallback[] = []

	constructor(name: string) {
		this.name = name
		this.start = now()
	}

	complete(err?: Error) {
		if (err) {
			this.error = err
		}
		this.is_complete = true
		const pending = this.pending
		this.pending = []
		for (const it of pending) {
			this.solve(it)
		}
	}

	add_pending(cb: SearchCallback) {
		if (this.is_complete) {
			this.solve(cb)
			return
		}
		this.pending.push(cb)
	}

	private solve(cb: SearchCallback) {
		this.error
			? cb.reject(this.error)
			: cb.resolve(cb.paged ? this.rows.slice(cb.offset, cb.limit ? cb.offset + cb.limit : undefined) : this.rows)
	}
}

type SearchCallback = {
	paged: boolean
	offset: number
	limit?: number
	resolve: (rows: SearchRow[]) => void
	reject: (err: Error) => void
}
