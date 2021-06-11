/**
 * @file Implements parsing and generation of queries.
 *
 * # Query Syntax
 *
 * - A keyword is matched against an entry kanji and reading elements. By
 *   default a keyword is compared both exactly and using approximate matching.
 *   - Prefixing a keyword with `=` will only match exactly
 *   - Prefixing a keyword with `>` will also enable fuzzy matching.
 *   - A keyword can contain `*` to match any sequence of zero or more characters.
 *   - A keyword can contain `?` to match any single character.
 * - Keywords can be combined with `&` (AND).
 *   - Only entries containing reading/kanji elements matching all keywords
 *     will be matched.
 * - Keywords can be combined with `~` (AND NOT).
 *   - Same as AND but only entries not containing the keyword prefixed
 *     by `~` will be matched.
 * - Multiple predicates can be separated by spaces. Entries can match either
 *   predicate (OR).
 * - A predicate can be negated by prefixing with `!` (NOT).
 *   - Within multiple predicates a NOT takes precedence and negates the match.
 *   - `A !B !C D` is equivalent to `(A OR D) AND NOT (B OR C)`.
 * - Parenthesis `()` or square brackets `[]` can be used to group predicates.
 *
 * Note that any of the above operators also accept their Japanese full-width
 * counterparts.
 */

import { kana } from '../../lib'

const DEBUG_QUERIES = true

/**
 * This is used to split tokens in the query string. It must include all special
 * operator characters.
 *
 * Note that keyword specific characters (e.g. `=`, `*`, `?`) are not included
 * here because they are not separate tokens.
 */
const OPERATORS = /[!！+＋~～&＆（）()「」[\]]/u

/** Not operator (full match). */
const NOT = /^[!！]$/u

/** And operator (full match). */
const AND = /^[+＋&＆]$/u

/** And-not operator (full match). */
const AND_NOT = /^[~～]$/u

/** Left parenthesis (full match). */
const LP = /^[（(「[]$/u

/** Right parenthesis (full match). */
const RP = /^[)）」\]]$/u

// (note that the keyword operators below are not separate tokens)

/** Glob characters inside a keyword. */
const KEYWORD_NEXT_GLOB = /[*＊?？]/u

/**
 * Glob operator for sequences (full match).
 *
 * Other matches from {KEYWORD_NEXT_GLOB} not matching this are considered the
 * glob operator for single characters.
 */
const GLOB_SEQUENCE = /^[*＊]$/u

/** Keyword prefix for an exact match. */
const EXACT = /^[=＝]/u

/** Keyword prefix for a fuzzy match. */
const FUZZY = /^[>＞]/u

/**
 * Type for a parsed search element.
 */
export type Search = Or | And | Not | Keyword

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

/**
 * Search OR operator.
 */
type Or = { op: 'or'; expr: Search[] }

/**
 * Search AND operator.
 */
type And = { op: 'and'; expr: Search[] }

/**
 * Search NOT operator.
 */
type Not = { op: 'not'; expr: Search }

/**
 * Search keyword.
 */
type Keyword = {
	op: 'text'

	/**
	 * How the keyword was specified in the search. This affects how the
	 * different {MatchMode}s are generated.
	 *
	 * - `normal` is the default mode for any keyword. This will enable the
	 *   keyword when {MatchMode} is both `exact` and `approx`, but will not
	 *   enable it with `fuzzy` mode.
	 *
	 * - `exact` disables the keyword when {MatchMode} is not `exact`.
	 *
	 * - `fuzzy` will enable this keyword when {MatchMode} is `fuzzy`.
	 */
	mode: 'normal' | 'exact' | 'fuzzy'

	/**
	 * Text chunks and glob operators that make up this keyword. Note that
	 * any literal text is always contiguous as a single string.
	 */
	text: Array<string | { glob: '*' | '?' }>

	/**
	 * If true, the entire keyword match is negated.
	 */
	negate?: boolean
}

/**
 * Parses a query string returning a parsed {Search} node or undefined if the
 * query is empty.
 *
 * This method throws exceptions on syntax errors.
 */
export function parse(query: string) {
	// Split the query string into tokens to facilitate parsing
	const tokens = query
		.normalize()
		.toUpperCase()
		.split(/\s+/)
		.flatMap((expr) => {
			// Split the string into raw text and operators. Operators are
			// each returned as a separate item.
			const out: string[] = []
			while (expr) {
				const pos = expr.search(OPERATORS)
				if (pos < 0) {
					out.push(expr)
					expr = ''
				} else {
					if (pos > 0) {
						out.push(expr.slice(0, pos))
						expr = expr.slice(pos)
					}
					const op = String.fromCharCode(expr.charCodeAt(0))
					out.push(op)
					expr = expr.slice(op.length)
				}
			}
			return out
		})
		.filter((x) => !!x)

	const expr: Search | undefined = parse_root(tokens)
	if (!expr) {
		return
	}

	if (DEBUG_QUERIES) {
		console.log(JSON.stringify(expr, null, '    '))
	}

	const has_sql = new Set<string>()
	const sql = (search: SearchMode, match: MatchMode) => {
		const where = sql_from_node(expr, search, match)
		if (!where || has_sql.has(where)) {
			return ''
		}

		if (DEBUG_QUERIES) {
			console.log()
			console.log(`==> ${search} / ${match}`)
			console.log(`    ${where}`)
		}

		has_sql.add(where)
		return [
			`SELECT DISTINCT m.sequence, e.position FROM (`,
			`  SELECT expr, sequence FROM entries_map`,
			`  WHERE ${where}`,
			`) m LEFT JOIN entries e ON e.sequence = m.sequence`,
			`ORDER BY length(m.expr), e.position`,
		].join('\n')
	}

	const queries = {
		exact_match: sql('full', 'exact'),
		exact_prefix: sql('prefix', 'exact'),
		exact_suffix: sql('suffix', 'exact'),
		exact_contains: sql('contains', 'exact'),
		approx_match: sql('full', 'approx'),
		approx_prefix: sql('prefix', 'approx'),
		approx_suffix: sql('suffix', 'approx'),
		approx_contains: sql('contains', 'approx'),
		fuzzy_match: sql('full', 'fuzzy'),
		fuzzy_prefix: sql('prefix', 'fuzzy'),
		fuzzy_suffix: sql('suffix', 'fuzzy'),
		fuzzy_contains: sql('contains', 'fuzzy'),
	}

	if (DEBUG_QUERIES) {
		console.log()
	}

	return { ...queries, id: tokens.join(' ') }
}

//============================================================================//
// SQL generation
//============================================================================//

/**
 * Top level search SQL generation. This generates the main WHERE condition
 * for a given node.
 */
function sql_from_node(node: Search, search: SearchMode, match: MatchMode): string {
	const p = (node: Search) => {
		const out = sql_from_node(node, search, match)
		switch (node.op) {
			case 'and':
			case 'or':
				return out ? `(${out})` : out
		}
		return out
	}
	switch (node.op) {
		case 'not': {
			const out = p(node.expr)
			return out ? `NOT ${out}` : ``
		}
		case 'and': {
			const out = node.expr
				.map((x) => p(x))
				.filter((x) => !!x)
				.map((x, i) => (i == 0 ? x : `(sequence IN (SELECT sequence FROM entries_map WHERE ${x}))`))
				.join(' AND ')
			return out ? `${out}` : ''
		}
		case 'or': {
			const pos_ops = node.expr.filter((x) => x.op != 'not')
			const neg_ops = node.expr.filter((x) => x.op == 'not')
			const pos = pos_ops
				.map((x) => p(x))
				.filter((x) => !!x)
				.join(' OR ')
			const neg = neg_ops
				.map((x) => p(x))
				.filter((x) => !!x)
				.join(' AND ')
			if (neg.length) {
				return pos ? `(${pos}) AND (${neg})` : `${neg}`
			}
			return pos
		}
		case 'text': {
			const condition = sql_from_keyword(node, search, match)
			return condition ? `${condition}` : ''
		}
	}
}

/**
 * Generate the LIKE operator for matching a keyword with the given parameters.
 *
 * This will return empty if the keyword is disabled for the given search and
 * match modes.
 */
function sql_from_keyword(keyword: Keyword, search: SearchMode, match: MatchMode) {
	// Handle cases where the keyword mode does not match the match mode.
	if (keyword.mode == 'exact' && match != 'exact') {
		return ''
	} else if (match == 'fuzzy' && keyword.mode != 'fuzzy') {
		return ''
	}

	// For suffix searches we reverse the keyword text and match the `_rev`
	// columns.
	const reverse = search == 'suffix' ? '_rev' : ''

	// The `keyword` column contains the approximated text used in non-exact
	// matches.
	const column = (match == 'exact' ? 'hiragana' : 'keyword') + reverse

	const exact = match == 'exact'
	const base = keyword.text.map((x) =>
		typeof x != 'string' ? x : exact ? kana.to_hiragana(x) : kana.to_hiragana_key(x),
	)

	// Reverse the keyword for a `suffix` match.
	const text = reverse ? base.reverse().map((x) => (typeof x == 'string' ? [...x].reverse().join('') : x)) : base

	// Generate the literal string used for the LIKE operator
	const expr = text.map((txt) => {
		if (typeof txt == 'string') {
			// Split and escape each individual character in the keyword text
			return (
				[...txt]
					// escape string quotes and LIKE operators
					.map((x) => (x == `'` ? `''` : /[%_\\]/.test(x) ? `\\${x}` : x))
					// for fuzzy matching we add a '%' between each character
					.join(match == 'fuzzy' ? '%' : '')
			)
		} else {
			// map the glob operators to the SQLite LIKE ones
			return txt.glob == '*' ? '%' : '_'
		}
	})

	const pos = search != 'full' ? '%' : ''
	const pre = search == 'contains' ? '%' : ''

	// Check if we needed to escape the LIKE operands inside the string
	const escape = expr.includes('\\') ? ` ESCAPE '\\'` : ``
	return `${column} ${keyword.negate ? 'NOT LIKE' : 'LIKE'} '${pre}${expr}${pos}'${escape}`
}

//============================================================================//
// Parsing
//============================================================================//

/**
 * Root parsing function for the query.
 */
function parse_root(input: string[]) {
	// Just call the main expression parsing function and make sure there are
	// no invalid tokens left after it.
	const expr = parse_expr(input)
	if (expr?.input.length) {
		throw new Error(`invalid syntax at '${input[0]}'`)
	}
	return expr?.node
}

/**
 * Parse a top level (or parenthesized) expression consisting of individual
 * predicates separated by spaces.
 *
 * Each predicate is combined with an OR operator.
 */
function parse_expr(input: string[]) {
	const expr: Search[] = []

	// Parse until the end of the input or until a right parenthesis, consuming
	// each space-separated predicate.
	while (input.length && !RP.test(input[0])) {
		const next = parse_not(input)
		if (!next) {
			break
		}
		input = next.input
		expr.push(next.node)
	}

	if (!expr.length) {
		return
	}

	// Simplify the returned expression if possible. We do not return NOT
	// as a single unit because it has a special meaning inside an OR node
	// (e.g. `A B !C` is different than `A B (!C)`).
	if (expr.length == 1 && expr[0].op != 'not') {
		return { node: expr[0], input }
	}

	const node: Search = { op: 'or', expr }
	return { node, input }
}

/**
 * Parse a prefix `NOT` operator.
 */
function parse_not(input: string[]) {
	// Consume any prefix NOT operators
	let negate = false
	while (NOT.test(input[0])) {
		input = input.slice(1)
		negate = !negate
	}

	// Parse the unary operand
	const next = parse_operand(input)
	if (next) {
		const node: Search = negate && next.node.op != 'not' ? { op: 'not', expr: next.node } : next.node
		return { node, input: next.input }
	}

	return
}

/**
 * Parse a unary operand. Either a parenthesized expression or a AND(NOT)
 * sequence.
 */
function parse_operand(input: string[]) {
	// Check for a parenthesized sub-expression...
	while (LP.test(input[0])) {
		// Next can return undefined for an empty group `()`
		const next = parse_expr(input.slice(1))
		input = next ? next.input : input

		// Check for the closing parenthesis
		if (!input.length || !RP.test(input[0])) {
			throw new Error(`invalid syntax at ${input[0]}`)
		}
		input = input.slice(1)

		// In case of an empty group we just ignore it and continue parsing.
		if (next) {
			return { input: next.input, node: next.node }
		}
	}

	// ...otherwise parse an AND expression.
	return parse_and(input)
}

/**
 * Parse a sequence of keywords joined by `AND` / `AND NOT` operators.
 */
function parse_and(input: string[]) {
	const expr: Search[] = []
	do {
		// Consume 'AND' and 'NOT' operators. We also allow for prefix
		// operators and ignore repeated
		let negate = false
		while (AND.test(input[0]) || AND_NOT.test(input[0])) {
			negate = AND_NOT.test(input[0]) ? !negate : negate
			input = input.slice(1)
		}

		const next = parse_keyword(input)
		if (next) {
			expr.push({ ...next.node, negate })
			input = next.input
		}
	} while (AND.test(input[0]) || AND_NOT.test(input[0]))

	if (!expr.length) {
		return
	}

	const node: Search = expr.length == 1 ? expr[0] : { op: 'and', expr }
	return { node, input }
}

/**
 * Parse a single keyword from the input.
 */
function parse_keyword(input: string[]) {
	if (input.length) {
		let raw_text = input[0]

		// Misplaced operator
		if (OPERATORS.test(raw_text)) {
			throw new Error(`invalid syntax at '${raw_text}'`)
		}

		// Check for the exact and fuzzy prefixes
		const exact = EXACT.test(raw_text)
		const fuzzy = FUZZY.test(raw_text)
		if (exact || fuzzy) {
			raw_text = raw_text.slice(String.fromCodePoint(raw_text.codePointAt(0)!).length)
		}

		// Parse the keyword text splitting by glob characters.
		const node: Keyword = { op: 'text', mode: exact ? 'exact' : fuzzy ? 'fuzzy' : 'normal', text: [] }
		while (raw_text.length) {
			const index = raw_text.search(KEYWORD_NEXT_GLOB)
			if (index < 0) {
				node.text.push(raw_text)
				raw_text = ''
			} else {
				if (index > 0) {
					node.text.push(raw_text.slice(0, index))
					raw_text = raw_text.slice(index)
				}

				const op = String.fromCodePoint(raw_text.codePointAt(0)!)
				if (GLOB_SEQUENCE.test(op)) {
					node.text.push({ glob: '*' })
				} else {
					node.text.push({ glob: '?' })
				}
				raw_text = raw_text.slice(op.length)
			}
		}

		return { node, input: input.slice(1) }
	}
	return
}
