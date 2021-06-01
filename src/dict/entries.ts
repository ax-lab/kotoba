import { kana } from '../../lib'
import { group_by } from '../../lib/list'

import DB from './db'
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
		.map((x) => `"${x}"`)
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
		const sources = source_map.get(row.sequence) || []
		const glossaries = glossary_map.get(row.sequence) || []
		const out = {
			id: row.sequence,
			word: '',
			read: '',
			rank: row.rank,
			position: row.position,
			frequency: row.frequency,
			jlpt: row.jlpt,
			popular: !!row.popular,
			kanji: kanji_map.get(row.sequence) || [],
			reading: reading_map.get(row.sequence) || [],
			sense: (sense_map.get(row.sequence) || []).map((row) => ({
				...row,
				source: sources.filter((x) => x.$pos == row.$pos),
				glossary: glossaries.filter((x) => x.$pos == row.$pos),
			})),
		}
		out.word = out.kanji.length ? out.kanji[0].expr : out.reading[0].expr
		out.read = out.reading[0].expr
		return out
	})

	const entries_map = new Map(entries.map((x) => [x.id, x]))
	return ids.map((x) => entries_map.get(x)!).filter((x) => !!x)
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

export async function search(args: { keyword: string }) {
	const search = Search.get(args.keyword)
	const rows = await search.exact()
	return await entries_by_ids(rows.map((x) => x.sequence))
}

const MAX_SEARCH_CACHE_ENTRIES = 100
const MIN_SEARCH_ENTRY_TTL_MS = 2 * 60 * 1000

/**
 * Encapsulate a running or cached search with its results. Provide methods
 * to trigger the search and wait on the results.
 */
class Search {
	readonly keyword: string
	readonly hiragana: string

	//#region Instance management

	/**
	 * Returns an instance of `Search` for the given keyword.
	 */
	static get(keyword: string) {
		keyword = keyword.trim().replace(/\s+/, ' ')
		let out = this.cache.get(keyword)
		if (!out) {
			this.clean_up()
			out = new Search(keyword)
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

	private static cache = new Map<string, Search>()

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
		const sql = `
			SELECT DISTINCT e.sequence, e.position
			FROM entries_map m
			LEFT JOIN entries e ON e.sequence = m.sequence
			WHERE m.expr LIKE ? OR m.expr LIKE ?
		`
		this.mark_used()
		return this.search_rows('exact', {
			sql,
			params: [this.keyword, this.hiragana],
		})
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
	 * all fragments of the prefix occur in keyword the match will be valid.
	 *
	 * Note that prefix matching can be quite slow on small prefixes or with
	 * fuzzy enabled.
	 */
	async prefix(args: { approx?: boolean; fuzzy?: boolean; limit?: number; offset?: number }) {
		this.mark_used()
	}

	/**
	 * Performs a suffix search. This is exactly the same as `prefix` but
	 * matches from the end of the keyword.
	 *
	 * The performance characteristics are also the same as `prefix`.
	 */
	async suffix(args: { approx?: boolean; fuzzy?: boolean; limit?: number; offset?: number }) {
		this.mark_used()
	}

	/**
	 * Performs a "contains" search. This is by far the slowest since it
	 * requires all entries to be scanned.
	 *
	 * The arguments have the same meaning as in the `prefix` search.
	 */
	async contains(args: { approx?: boolean; fuzzy?: boolean; limit?: number; offset?: number }) {
		this.mark_used()
	}

	private operations = new Map<string, SearchOp>()

	/**
	 * Raw search implementation. This takes a unique operation key, setup
	 * configuration, and paging arguments.
	 *
	 * Returns a promise that will be resolved once some data is available for
	 * the given offset/limit range (not necessarily the whole range, see below).
	 *
	 * The first time this method is called, it will initiate the given search
	 * operation in the background and return a promise tied to the operation
	 * and to the range given by the paging arguments.
	 *
	 * As data is loaded by the background operation, the pending promises will
	 * get resolved as soon as data in the range is available.
	 *
	 * If a new search request is given for a range already available, the
	 * promise is resolved immediately.
	 *
	 * Note that the provided paging limit is just a maximum, as the promise
	 * will be resolved as soon as data is available for the given offset.
	 */
	private async search_rows(id: string, args: { sql: string; params: unknown; offset?: number; limit?: number }) {
		const op =
			this.operations.get(id) ||
			((op: SearchOp) => {
				this.operations.set(id, op)
				return op
			})(new SearchOp(`${this.keyword} (${id})`))
		if (!op.started) {
			const db = await DB.get_dict()
			op.started = true
			console.log(`Starting '${this.keyword}' search (${id})`)
			db.each<SearchRow>(
				args.sql,
				args.params,
				(err, row) => {
					if (!op.error) {
						console.log(`> ${this.keyword}: ${err ? err : row.sequence}`)
						op.error ||= err
						if (row) {
							op.rows.push(row)
						}
					}
				},
				(err, count) => {
					console.log(`Completed '${this.keyword}' search (${count})`, err)
					op.complete(err)
				},
			)
		}

		const paged = args.offset != null
		const offset = args.offset || 0
		const limit = args.limit

		// For incomplete operations we add a pending operation
		return new Promise<SearchRow[]>((resolve, reject) => {
			op.add_pending({ paged, offset, limit, resolve, reject })
		})
	}
}

type SearchRow = {
	sequence: string
	position: number
}

class SearchOp {
	name: string
	rows: SearchRow[] = []
	error?: Error | null
	is_complete?: boolean
	started?: boolean
	pending: SearchCallback[] = []

	constructor(name: string) {
		this.name = name
	}

	complete(err: Error | null) {
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

	check_solved(delay_ms?: number) {
		const p = this.pending
		let solved = 0
		for (solved = 0; solved < p.length && p[solved].paged && p[solved].offset < this.rows.length; solved++) {
			if (!delay_ms) {
				this.solve(p[solved])
			} else {
				const it = p[solved]
				setTimeout(() => this.solve(it), delay_ms)
			}
		}
		if (solved > 0) {
			this.pending = this.pending.slice(solved)
		}
	}

	add_pending(cb: SearchCallback) {
		if (this.is_complete) {
			this.solve(cb)
			return
		}
		console.log(`+ pending ${cb.paged} ~ ${cb.offset} / ${cb.limit}`)
		this.pending.push(cb)
		this.pending.sort((a, b) => {
			if (a.paged != b.paged) {
				// Sort non-paged operations to the end
				return (a.paged ? 1 : 0) - (b.paged ? 1 : 0)
			}
			// Sort earlier offsets first
			return a.offset - b.offset
		})
	}

	private solve(cb: SearchCallback) {
		console.log(`= solving ${cb.paged} ~ ${cb.offset} / ${cb.limit} -- ${this.rows.length} / ${this.error}`)
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
