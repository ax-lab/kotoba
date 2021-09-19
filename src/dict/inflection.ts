import { check, compile_glob, elapsed, kana, now } from '../../lib'
import { load_json_file } from '../../lib/files'

import { entries_exact } from './entries'
import { Entry } from './entry'

type InflectionRow = {
	kanaIn: string
	kanaOut: string
	rulesIn: string[]
	rulesOut: string[]
}

type InflectionTable = {
	[key: string]: InflectionRow[]
}

type InflectionRule = InflectionRow & { name: string }

const RULES = (() => {
	const data = load_json_file<InflectionTable>('./data/grammar/deinflect.json')
	return Object.keys(data).flatMap<InflectionRule>((name) => data[name].map((x) => ({ ...x, name })))
})()

const { SUFFIXES, MAX_SUFFIX } = (() => {
	let max_len = 0
	const out = new Set<string>()
	for (const it of RULES) {
		const suffix = it.kanaIn
		max_len = Math.max(max_len, suffix.length)
		out.add(suffix)
	}
	return { SUFFIXES: out, MAX_SUFFIX: max_len }
})()

export async function deinflect(word: string) {
	const start = now()
	const deinflector = new Deinflector()
	deinflector.add(word)
	const all = deinflector.list_candidates()
	const entries = await entries_exact(all)
	const out = deinflector.filter(entries)
	console.log(`deinflect(${word}) took ${elapsed(start)}`)
	return out
}

export async function deinflect_all(input_text: string) {
	type Segment = {
		match: string
		exact: boolean
		sta: number
		end: number
	}

	const deinflector = new Deinflector()

	const start = now()

	let segments: Segment[] = []
	for (let i = 0; i < input_text.length - 1; i++) {
		for (let j = input_text.length; j > i; j--) {
			const segment = input_text.slice(i, j)
			const hiragana = kana.to_hiragana(segment)

			let can_deinflect = false
			for (let k = 1; k <= hiragana.length && k <= MAX_SUFFIX; k++) {
				if (SUFFIXES.has(hiragana.slice(hiragana.length - k))) {
					can_deinflect = true
					break
				}
			}

			deinflector.add(hiragana)
			segments.push({ match: hiragana, exact: !can_deinflect, sta: i, end: j })
		}
	}

	// const all = new Set<string>()
	// const candidate_map = new Map<string, Candidate[]>()
	// for (const it of segments) {
	// 	if (it.exact) {
	// 		all.add(it.match)
	// 	} else if (!candidate_map.has(it.match)) {
	// 		const ls = candidates(it.match)
	// 		candidate_map.set(it.match, ls)
	// 		for (const word of ls) {
	// 			all.add(word.input)
	// 		}
	// 	}
	// }

	const all = deinflector.list_candidates()
	const entries = deinflector.filter(await entries_exact(all))

	const entries_map = new Map<string, Entry[]>()

	const push = (entry: Entry, txt: string) => {
		txt = kana.to_hiragana(txt)
		const ls = entries_map.get(txt)
		if (!ls) {
			entries_map.set(txt, [entry])
		} else {
			ls.push(entry)
		}
	}

	for (const entry of entries) {
		for (const it of entry.kanji) {
			push(entry, it.expr)
		}
		for (const it of entry.reading) {
			push(entry, it.expr)
		}
	}

	segments.sort((a, b) => {
		if (a.match.length != b.match.length) {
			return b.match.length - a.match.length
		}
		if (a.sta != b.sta) {
			return a.sta - b.sta
		}
		return b.end - a.end
	})

	const output = []
	while (segments.length) {
		const segment = segments.shift()!

		const entries = entries_map.get(segment.match)
		const matches: Entry[] = []
		if (entries) {
			matches.push(...entries)
		} else {
			// ;(candidate_map.get(segment.match) || []).map((row) => {
			// 	const entries = (entries_map.get(row.input) || [])
			// 		.filter((x) => row.rules.size == 0 || x.has_rule_tag(row.rules))
			// 		.map((x) => x.with_deinflect([...row.reasons]))
			// 	matches.push(...entries)
			// })
		}

		if (matches.length) {
			output.push({
				input: input_text.slice(segment.sta, segment.end),
				keyword: segment.match,
				position: segment.sta,
				entries: matches,
			})

			segments = segments.filter((it) => it.end <= segment.sta || it.sta >= segment.end)
		}
	}

	output.sort((a, b) => a.position - b.position)

	console.log(`deinflect_all(${input_text}) took ${elapsed(start)}`)

	return output
}

/**
 * Deinflection candidate.
 */
type Candidate = {
	/**
	 * The term resulting from the deinflection.
	 */
	term: string

	/**
	 * The original term (raw).
	 */
	source: string

	/**
	 * If the original deinflection is partial, this is the added suffix.
	 */
	partial: string

	/**
	 * The uninflected prefix.
	 */
	prefix: string

	/**
	 * Expected grammar rule tags for the de-inflected term.
	 */
	rules: Set<string>

	/**
	 * List of deinflection rules applied to the source term.
	 */
	reasons: InflectionRule[]

	/**
	 * If the input term is a glob, this is a regex that matches it.
	 */
	glob?: RegExp
}

// TODO: fix 認められない

/**
 * This class provides deinflection support for multi-term queries.
 *
 * The base lookup entries can be added using `add` and a list of all possible
 * deinflection candidates retrieved with `list_candidates`.
 *
 * Once loaded, the matching entries can then be filtered using `filter` to
 * narrow it down to only valid deinflections.
 */
export class Deinflector {
	readonly _added = new Set<string>()

	readonly _map = new Map<string, Candidate[]>()
	readonly _glob: Candidate[] = []

	/**
	 * Add an entry to the deinflection list. This will generate all possible
	 * candidates for this entry.
	 *
	 * The entry should be converted to hiragana.
	 */
	add(entry: string, allow_partial = false) {
		if (!this._added.has(entry)) {
			this._added.add(entry)

			// Map the form to the specific de-inflection
			const list = this._candidates(entry, allow_partial)
			for (const it of list) {
				const ls = this._map.get(it.term) || []
				ls.push(it)
				this._map.set(it.term, ls)
				if (it.glob) {
					this._glob.push(it)
				}
			}
		}
	}

	/**
	 * List all possible candidates for the added entries. The purpose of those
	 * is to be matched exactly when attempting to load.
	 */
	list_candidates() {
		return [...this._map.keys()]
	}

	/**
	 * Filter a list of entries loaded from the candidates to only those that
	 * are valid de-inflections.
	 *
	 * In addition, this will also fill the de-inflection info on the returned
	 * entries.
	 */
	filter(entries: Entry[]) {
		const out = entries.flatMap((entry) => {
			// Collect the candidate deinflections
			const candidates = [...entry.kanji, ...entry.reading]
				.flatMap((it) => {
					const expr = kana.to_hiragana(it.expr)
					const list = this._map.get(expr) || this._glob.filter((x) => x.glob!.test(expr))
					return list.map((x) => ({ expr, item: x }))
				})
				.filter(({ item }) => !item.rules.size || entry.has_rule_tag(item.rules))
				.sort((a, b) => {
					// Favor full deinflections or with smaller completed suffixes
					const partial = a.item.partial.length - b.item.partial.length
					if (partial != 0) {
						return partial
					}

					// prioritize the shortest number of rules applied
					const rules = a.item.reasons.length - b.item.reasons.length
					if (rules != 0) {
						return rules
					}

					// favor the shortest expressions
					return a.expr.length - b.expr.length
				})

			const best = candidates.shift()
			if (best) {
				const expr = best.expr
				const deinflect = best.item
				const info = get_inflection_info(expr, deinflect.reasons)

				const match_text = `${deinflect.source}:${expr}:${info.prefix}.${info.suffix_pos}`
				return [
					entry.with_deinflect(deinflect.reasons.map((x) => x.name)).with_match_mode('deinflect', match_text),
				]
			}

			return []
		})
		return out
	}

	private _candidates(source: string, allow_partial = false) {
		// Based on https://github.com/FooSoft/yomichan/blob/f68ad1f843607d4ba1ad216fe16305c420cee8d6/ext/js/language/deinflector.js#L23

		const out: Candidate[] = []
		const queue: Candidate[] = [
			{ term: source, source, partial: '', prefix: source, rules: new Set(), reasons: [] },
		]

		for (let i = 0; i < queue.length; i++) {
			// The term we want to deinflect
			const current = queue[i]
			const input = current.term

			out.push(current)

			// Do we allow partial deinflection? (i.e. for a partially typed suffix)
			const can_partial = allow_partial && i == 0

			// Try to match the current term with all possible rules
			for (const rule of RULES) {
				const src = rule.kanaIn
				const dst = rule.kanaOut

				// Use the term suffix to check if the rule is applicable
				let match = input.endsWith(src) ? src : ''
				let partial = ''
				if (!match && can_partial) {
					for (let i = src.length - 1; !match && i > 0; i--) {
						const suffix = src.slice(0, i)
						if (input.endsWith(suffix)) {
							match = suffix
							partial = src.slice(i)
						}
					}
				}

				if (!match || input.length - match.length + dst.length <= 0) {
					continue // we didn't match or resulted in an empty term
				}

				if (current.rules.size && !rule.rulesIn.some((x) => current.rules.has(x))) {
					continue // grammar rules don't apply to the current term
				}

				const prefix = input.slice(0, input.length - match.length)
				const next = prefix + dst
				queue.push({
					term: next,
					source: current.source,
					partial: current.partial || partial,
					prefix,
					rules: new Set(rule.rulesOut),
					reasons: [rule, ...current.reasons],
				})
			}
		}

		for (const it of out) {
			if (/[*?]/.test(it.term)) {
				it.glob = compile_glob(it.term)
			}
		}

		return out
	}
}

function get_inflection_info(expr: string, reasons: InflectionRule[]) {
	if (!reasons.length) {
		return { prefix: expr, suffix_pre: '', suffix_pos: '' }
	}

	check(expr.endsWith(reasons[0].kanaOut), 'expression has rule suffix')

	const prefix = expr.slice(0, expr.length - reasons[0].kanaOut.length)
	const suffix_pre = reasons[0].kanaOut

	let suffix_pos = suffix_pre
	for (const it of reasons) {
		check(suffix_pos.endsWith(it.kanaOut), 'inflection rule and suffix match')
		suffix_pos = suffix_pos.slice(0, suffix_pos.length - it.kanaOut.length) + it.kanaIn
	}

	return { prefix, suffix_pre, suffix_pos }
}
