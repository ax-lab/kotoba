/**
 * @file Implements parsing and generation of queries.
 *
 * # Query Syntax
 *
 * The query string is split by spaces into predicates. The results of all
 * predicates are combined.
 *
 * By default predicates are considered as plain sentences (see below for
 * details).
 *
 * Advanced search predicates can be constructed by starting them with one
 * of these prefix operators:
 *
 * - `+` or `＋`: disables the normal sentence matching and enables operators
 *   in the predicate. Does nothing otherwise.
 *
 * - `!` or `！`: negates the predicate. Negated predicates have precedence,
 *   filtering out any matching entries regardless of other predicates.
 *
 * - `=` or `＝`: only matches exact entries for this predicate.
 *   - Disables de-inflection when searching for terms.
 *   - This disables the default behavior that tries to match approximate
 *     entries when a predicate returns no exact results.
 *   - This will also disable fuzzy matching with this predicate if no results
 *     are found overall.
 *
 * - `>` or `＞`: forces approximate matching in this predicate even if exact
 *   matches are found. By default approximate matching is only used when a
 *   predicate has no exact match.
 *
 * - `?` or `？`: forces fuzzy matching this predicate, regardless of other
 *   results. The default behavior is to only use fuzzy matching if no results
 *   are found overall.
 *
 * Additionally, the following operators can be used anywhere in an advanced
 * search predicate:
 *
 * - `&` or `＆`: combine terms in a predicate with an AND. Only entries that
 *   match all operator-prefixed terms and the main entry (in any reading or
 *   kanji element) will match.
 *
 * - `~` or `～`: combine terms in a predicate with a NOT AND. Only matching
 *   entries that also do not match any operator-prefixed term will match.
 *
 * - `*` or `＊`: matches any sequence of zero or more characters in the term.
 *
 * - `?` or `？`: matches any single character in the term.
 *
 * NOTES:
 *
 * - Predicates are always converted to hiragana before matching. Note that
 *   hiragana conversion does affect kanji or Japanese symbols.
 * - Terms are matched against all kanji and reading elements for an entry.
 * - The `&` and `~` can be freely combined. Empty terms are ignored.
 * - Approximate and fuzzy matching only apply to positive matching (i.e. not
 *   for negated and the `~` operator).
 *
 *
 * ## Sentence Lookup
 *
 * Sentence predicates are also normalized. Any sentences are first looked up
 * for exact matches. If nothing is found, then the search will attempt to
 * match contained words and their de-inflections.
 *
 * When matching words inside a sentence, the sentence is first split by
 * punctuation and symbols. Only letters are matched.
 *
 * Word matching will always try to match the longest sequences possible. In
 * general, if a sequence matches, no sub-matches inside that sequence are
 * returned, except:
 *
 * - The sub-match has kanji and is entirely contained within the outer match.
 * - Additional prefix matches that are longer than single-kana entries.
 * - The longest suffix sub-match is also returned if it does not overlap with
 *   any other sub-matches.
 *
 * After the basic search and if this is the last predicate, any unmatched
 * suffix leftover in the sentence is further looked up as follows:
 *
 * - As a de-inflected entry including partial suffixes.
 * - As a prefix, suffix (including de-inflections), and contains query.
 * - If still nothing is matched, then approximate matching is attempted.
 * - De-inflection is not attempted if the unmatched suffix is a single kana.
 *
 * The unmatched suffix is also used as a candidate for fuzzy matching if no
 * results are found in the overall query.
 *
 * ## Result Order
 *
 * The search is divided in phases. More precise (and faster) lookups are
 * attempted first. Results are made available incrementally as soon as they
 * are available.
 *
 * The general order of the search goes as follows:
 *
 * - Exact matches.
 * - Exact prefix matches.
 * - Exact suffix matches.
 * - Sentence matching and de-inflections.
 * - Approximate matching (exact / prefix / suffix).
 * - Fuzzy matching.
 *
 * For each phase, results are generally ordered by frequency and relevance of
 * the word. For multi-word sentences, results are sorted by appearance in the
 * sentence.
 *
 */

import { compile_glob, kana } from '../../lib'

import { SearchCache } from './cache'
import DB from './db'
import { Entry, EntryMatchMode } from './entry'
import * as inflection from './inflection'

const DEBUG_QUERIES = false

/**
 * Defines how to match entries in the search to the specified keywords.
 *
 * - `full` match entries that contain the entire keyword.
 * - `prefix` match entries with the keyword as prefix.
 * - `suffix` match entries with the keyword as suffix.
 * - `contains` match entries that contain the keyword.
 *
 * Note that keywords are matched against both the kanji and reading elements
 * of entries. A match from any element is considered successful.
 */
export type SearchMode = 'full' | 'prefix' | 'suffix' | 'contains'

/**
 * Defines how the text of a keyword will be matched with the text of an entry.
 *
 * This combines with {SearchMode} to determine how an entry will be matched.
 *
 * - `exact` will match the text exactly.
 *
 * - `approx` will match keywords approximately using `to_hiragana_key` before
 *   comparing the keyword and entry text.
 *
 * - `fuzzy` is the same as `approx` but only requires that characters in the
 *   keyword appear in the entry in order (equivalent to having a `*` operator
 *   between each character in the keyword).
 */
export type MatchMode = 'exact' | 'approx' | 'fuzzy'

type SearchSentence = {
	type: 'sentence'

	/**
	 * Full text of the sentence.
	 */
	full_text: string

	/**
	 * This is `full_text` split by punctuation and symbols. This is used
	 * by the phrase deinflection to limit the word search.
	 */
	terms: string[]
}

type SearchQueryMode = 'normal' | 'negate' | 'exact' | 'approximate' | 'fuzzy'

type SearchQueryTerm = { text: string; not?: boolean; glob?: boolean }

type SearchQuery = {
	type: 'query'
	mode: SearchQueryMode
	terms: SearchQueryTerm[]
}

type SearchPredicate = SearchSentence | SearchQuery

type Search = {
	id: string
	predicates: SearchPredicate[]
}

type SearchRow = {
	sequence: string
	position: number
}

/**
 * Should we consider a normal sentence with `?`, `*`, `&`, and `~` as a glob?
 */
const PARSE_GLOB_IN_NORMAL_SENTENCES = false

/**
 * Parses a query string returning a parsed {Search} node.
 */
export function parse(query: string): Search {
	const text = query
		.normalize()
		.toUpperCase()
		.split(/\s+/u)
		.filter((x) => !!x)

	// Parse a non-sentence query, except for the first operator.
	const parse_query = (query: string, mode: SearchQueryMode, skip_operator: boolean): SearchQuery => {
		const terms: SearchQueryTerm[] = query
			.slice(skip_operator ? 1 : 0) // ignore the first operator
			.split(/[&＆]/) // first split by the AND
			.filter((x) => !!x)
			.flatMap((txt) => {
				return txt
					.split(/[~～]/) // split by the AND-NOT
					.map((term, n) => {
						const text = kana.to_hiragana(term).replace(/＊/g, '*').replace(/？/g, '?')
						return n == 0 ? { text } : { text, not: true, glob: /[?*]/.test(text) }
					})
					.filter((x) => x.text)
			})

		// Sort the terms so that positive and more restrictive terms come
		// first. In general, it is only the first term that will determine
		// the performance of the overall query.
		terms.sort((a, b) => {
			// positive terms first, since negative terms are slower to query
			// and broader
			if (a.not != b.not) {
				return (a.not ? 1 : 0) - (b.not ? 1 : 0)
			}

			// sort by the largest non-glob prefix
			const ng_a = a.text.match(/^[^*?]*/)![0]
			const ng_b = b.text.match(/^[^*?]*/)![0]
			if (ng_a.length != ng_b.length) {
				return ng_b.length - ng_a.length
			}

			// sort by the largest number of non-glob characters
			const sa = a.text.replace(/[*?]/g, '')
			const sb = b.text.replace(/[*?]/g, '')
			return sb.length - sa.length
		})

		return {
			type: 'query',
			mode,
			terms,
		}
	}

	const SPLIT_RE = /[^\p{Alpha}\p{Number}－・]+/u

	const predicates = text
		.map<SearchPredicate>((txt) => {
			switch (txt[0]) {
				case '+':
				case '＋':
					return parse_query(txt, 'normal', true)
				case '!':
				case '！':
					return parse_query(txt, 'negate', true)
				case '=':
				case '＝':
					return parse_query(txt, 'exact', true)
				case '>':
				case '＞':
					return parse_query(txt, 'approximate', true)
				case '?':
				case '？':
					return parse_query(txt, 'fuzzy', true)
				default: {
					// If the term contains any operators we also consider it
					// as an advanced query.
					if (PARSE_GLOB_IN_NORMAL_SENTENCES && /[*＊?？~～&＆]/.test(txt)) {
						return parse_query(txt, 'normal', false)
					}

					const full_text = kana.to_hiragana(txt)
					return {
						id: txt,
						type: 'sentence',
						full_text,
						terms: full_text.split(SPLIT_RE).filter((x) => !!x),
					}
				}
			}
		})
		.filter((x) => x.terms.length)

	const id = text.join(' ')

	const out = { id, predicates }

	if (DEBUG_QUERIES) {
		console.log('QUERY:', query)
		console.log(JSON.stringify(out, null, '    '))
	}

	return out
}

/**
 * Search for an exact match for the given predicate.
 *
 * The performance of this lookup depends on the terms:
 *
 * - For an exact search this is a direct index lookup.
 * - If the term contains glob characters then the performance depends on the
 *   size of the literal (non-glob) prefix.
 * - For multiple terms, the lookup will attempt to use the more specific
 *   term for filtering first.
 */
export async function search_exact(cache: SearchCache, db: DB, predicate: SearchPredicate) {
	return await search_with_mode('full', 'exact', cache, db, predicate)
}

// TODO: use readings of kanji to try to find partial matches (巻きぞえ -> 巻き添え - まきぞえ)

/**
 * Search for deinflected versions of the given predicate. This will only apply
 * to the entire terms and will not attempt to look for sub-matches.
 *
 * This is compatible with glob characters. The performance of this is
 * comparable to `search_exact` but this will try to load all possible
 * deinflections for the terms, so the candidate list might be big.
 */
export async function search_deinflection(
	cache: SearchCache,
	_db: DB,
	predicate: SearchPredicate,
	allow_partial = false,
	limit_max = 0,
) {
	const inflector = new inflection.Deinflector()
	const reject: RegExp[] = []
	if (predicate.type == 'sentence') {
		// attempt to de-inflect the whole sentence
		inflector.add(predicate.full_text, allow_partial)
	} else {
		if (predicate.mode == 'exact') {
			return 0
		}

		for (const it of predicate.terms) {
			if (it.not) {
				// negative terms are added to the rejection list so we can
				// filter then later
				reject.push(compile_glob(it.text))
			} else {
				// positive terms are added to the de-inflection candidate list
				inflector.add(it.text, allow_partial)
			}
		}
	}

	// Load all candidates
	const all = inflector.list_candidates()

	const candidates = await Entry.exact(all, { glob: true })

	// Apply negative filters
	const entries = candidates.filter((it) => !it.matches_any(reject))

	// Filter the entries through the de-inflector.
	const output = inflector.filter(entries)
	if (limit_max > 0 && output.length > limit_max) {
		return 0
	}

	return await cache.push_and_solve(output)
}

/**
 * Search for deinflected submatches in an entire phrase.
 */
export async function search_phrase(cache: SearchCache, db: DB, predicate: SearchPredicate, allow_partial = false) {
	if (predicate.type != 'sentence') {
		return 0
	}

	// Fully kana sentences are usually not a phrase, and trying to deinflect
	// them gets to noisy.
	if (kana.is_kana(predicate.full_text)) {
		return 0
	}

	// Deinflect all parts of the phrase.
	const inflector = new inflection.Deinflector()
	for (const term of predicate.terms) {
		inflector.add_phrase(term)
	}

	// Try to load all possible candidates and feed them back to the deinflector.
	const all = inflector.list_candidates()
	const candidates = await Entry.exact(all, { glob: false })
	const result = inflector.deinflect_all(candidates, predicate.full_text, predicate.terms)

	let count = await cache.push_and_solve(result.entries)

	// If there is an uninflected suffix, forward it to a normal search.
	if (result.suffix && count > 0) {
		count += await search_deinflection(
			cache,
			db,
			{ type: 'sentence', full_text: result.suffix, terms: [result.suffix] },
			allow_partial,
		)
	}

	return count
}

/**
 * Search the given predicate using the given search and match modes.
 *
 * The performance and broadness of this lookup depends on the size of the
 * literal prefix available for the filtering.
 */
export async function search_with_mode(
	search: SearchMode,
	match: MatchMode,
	cache: SearchCache,
	db: DB,
	predicate: SearchPredicate,
	limit = 0,
) {
	const is_exact = search == 'full' && match == 'exact'

	// This is mostly the same as `search_exact` except that we are generating
	// prefix matches.
	const where: string[] = []
	if (predicate.type == 'sentence') {
		where.push(like(predicate.full_text, search, match))
	} else {
		// The exact operator forces an exact match only.
		if (predicate.mode == 'exact' && !is_exact) {
			return 0
		}

		// Those are used only for negative filtering
		if (predicate.mode == 'negate') {
			return 0
		}

		// Ignore fully negative searches since those are too broad and slow.
		if (!predicate.terms.some((x) => !x.not)) {
			return 0
		}

		for (const it of predicate.terms) {
			const negate = it.not
			if (!where.length && !negate) {
				// For the first positive term we use the LIKE operator because
				// it is faster than the IN. We are counting on the term sorting
				// done by the search parsing to make sure the first term is the
				// most efficient lookup.
				const condition = like(it.text, search, match, { glob: true, negate })
				where.push(condition)
			} else {
				// Additional or negative terms have to use the IN operator to
				// consider all reading/kanji for a term.
				//
				// Note that for negative terms we use full matching regardless
				// of the lookup mode.
				const condition = like(it.text, negate ? 'full' : search, negate ? 'exact' : match, { glob: true })
				where.push(`sequence ${negate ? 'NOT IN' : 'IN'} (SELECT sequence FROM entries_map WHERE ${condition})`)
			}
		}
	}

	let match_mode: EntryMatchMode
	switch (search) {
		case 'full':
			switch (match) {
				case 'exact':
					match_mode = 'exact'
					break
				case 'approx':
					match_mode = 'approx'
					break
				case 'fuzzy':
					match_mode = 'fuzzy'
					break
			}
			break
		case 'prefix':
			switch (match) {
				case 'exact':
					match_mode = 'prefix'
					break
				case 'approx':
					match_mode = 'approx-prefix'
					break
				case 'fuzzy':
					match_mode = 'fuzzy-prefix'
					break
			}
			break
		case 'suffix':
			switch (match) {
				case 'exact':
					match_mode = 'suffix'
					break
				case 'approx':
					match_mode = 'approx-suffix'
					break
				case 'fuzzy':
					match_mode = 'fuzzy-suffix'
					break
			}
			break
		case 'contains':
			switch (match) {
				case 'exact':
					match_mode = 'contains'
					break
				case 'approx':
					match_mode = 'approx-contains'
					break
				case 'fuzzy':
					match_mode = 'fuzzy-contains'
					break
			}
			break
	}

	return await load_entries(cache, db, where.join(' AND '), match_mode, predicate, limit)
}

/**
 * Helper to load a list of entries by SQL condition. This function loads
 * asynchronously and incrementally.
 */
async function load_entries(
	cache: SearchCache,
	db: DB,
	where: string,
	mode: EntryMatchMode,
	predicate: SearchPredicate,
	limit = 0,
) {
	console.log('WHERE:', where)
	const limit_sql = limit > 0 ? ` LIMIT ${limit}` : ``
	const sql = [
		`SELECT DISTINCT m.sequence, e.position FROM (`,
		`  SELECT expr, sequence FROM entries_map`,
		`  WHERE ${where}${limit_sql}`,
		`) m LEFT JOIN entries e ON e.sequence = m.sequence`,
	].join('\n')

	console.log(sql)

	// Size of the batch to load entries by ID
	const LOAD_BATCH = 1000

	// Queue of pending IDs
	let queue: string[] = []

	// Number of rows loaded
	let count = 0

	// Asynchronous function to flush the queue and load items.
	let is_flushing = false
	let current_flush: Promise<void> | null = null
	const flush_async = async () => {
		is_flushing = true
		try {
			while (queue.length) {
				const ids = queue.slice(0, LOAD_BATCH)
				queue = queue.slice(LOAD_BATCH)
				const rows = await Entry.get(ids)
				count += rows.length
				await cache.push_and_solve(rows.map((x) => match_predicate(x, mode, predicate)))
			}
		} finally {
			is_flushing = false
		}
	}

	const flush = () => {
		if (!is_flushing && queue.length) {
			current_flush = flush_async()
		}
	}

	await db.query_each<SearchRow>((row: SearchRow) => {
		queue.push(row.sequence)
		if (queue.length % 100 == 0) {
			flush()
		}
	}, sql)

	flush()

	if (current_flush) {
		await current_flush!
	}

	return count
}

/**
 * Internal helper to generate a SQL `like` condition.
 */
function like(text: string, search: SearchMode, match: MatchMode, args?: { glob?: boolean; negate?: boolean }) {
	// For suffix searches we reverse the keyword text and match the `_rev`
	// columns.
	const reverse = search == 'suffix' ? '_rev' : ''

	// The `keyword` column contains the approximated text used in non-exact
	// matches.
	const column = (match == 'exact' ? 'hiragana' : 'keyword') + reverse

	const exact = match == 'exact'
	const base = exact ? text : kana.to_hiragana_key(text)
	const chars = [...base]
	const expr = (reverse ? chars.reverse() : chars)
		.map((x) => {
			// escape string quotes and LIKE operators
			if (x == `'`) {
				return `''`
			} else if (/[%_\\]/.test(x)) {
				return `\\${x}`
			} else if (args?.glob) {
				if (x == '*' || x == '＊') {
					return '%'
				} else if (x == '?' || x == '？') {
					return '_'
				}
			}
			return x
		})
		// for fuzzy matching we add a '%' between each character
		.join(match == 'fuzzy' ? '%' : '')

	const escape = expr.includes('\\') ? ` ESCAPE '\\'` : ``

	const pos = search != 'full' ? '%' : ''
	const pre = search == 'contains' ? '%' : ''
	return `${column} ${args?.negate ? 'NOT LIKE' : 'LIKE'} '${pre}${expr}${pos}'${escape}`
}

function match_predicate(entry: Entry, mode: EntryMatchMode, predicate: SearchPredicate) {
	const terms = entry.kanji.map((x) => x.expr).concat(entry.reading.map((x) => x.expr))
	const query =
		predicate.type == 'sentence'
			? [predicate.full_text]
			: predicate.terms.filter((x) => predicate.mode != 'negate' && !x.not).map((x) => x.text)
	const match = terms
		.map((expr) => {
			return query
				.map((q) => best_match_text(q, kana.to_hiragana(expr))!)
				.filter((x) => !!x)
				.sort((a, b) => b.p - a.p)
				.shift()!
		})
		.sort((a, b) => b.p - a.p)
		.filter((x) => !!x)
		.shift()

	return !match
		? entry.with_match_info({ mode, query: '', text: '', segments: '' })
		: entry.with_match_info({
				mode,
				query: match.query,
				text: match.expr,
				segments: match.match,
		  })
}

function best_match_text(query: string, expr: string) {
	const pos = expr.indexOf(query)
	if (pos >= 0) {
		return { p: 10 + query.length / expr.length, query, expr, match: query }
	}

	if (query.length >= expr.length) {
		return null
	}

	let cur = 0,
		str = ''
	for (const chr of query) {
		const next = expr.indexOf(chr, cur)
		if (next < 0) {
			return null
		}
		cur = next
		str += chr
	}

	return { p: str.length / expr.length, query, expr, match: str }
}
