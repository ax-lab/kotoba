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
	const deinflector = new Deinflector()
	deinflector.add_phrase(input_text)

	const all = deinflector.list_candidates()
	const entries = await entries_exact(all)

	return deinflector.deinflect_all(entries, input_text, [input_text])
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

type Segment = {
	match: string
	sta: number
	end: number
}

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

	// This maps the resulting deinflected terms to the list of candidate
	// deinflections that generated that term.
	readonly _map = new Map<string, Candidate[]>()
	readonly _glob: Candidate[] = []

	// This maps a source segment to a list of candidate de-inflections.
	readonly _reverse_map = new Map<string, Candidate[]>()

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
			this._reverse_map.set(entry, list)

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

	readonly _segments = new Map<string, Segment[]>()

	/**
	 * Add an entire phrase to the deinflection list. This will try to find
	 * deinflected words inside the phrase.
	 */
	add_phrase(phrase: string, allow_partial = false) {
		if (this._segments.has(phrase)) {
			return
		}

		// Limit the maximum length of the phrase we allow.
		if (phrase.length > 150) {
			this._segments.set(phrase, [])
			return
		}

		// Limit the max segment length to a reasonable word size.
		const max_segment = 50

		const segments: Segment[] = []
		for (let i = 0; i < phrase.length - 1; i++) {
			const end = Math.min(phrase.length, i + max_segment)
			for (let j = end; j > i; j--) {
				const segment = phrase.slice(i, j)
				this.add(segment, allow_partial && j == phrase.length)
				segments.push({ match: segment, sta: i, end: j })
			}
		}

		// We sort the segments by the largest match first and then position.
		segments.sort((a, b) => {
			if (a.match.length != b.match.length) {
				return b.match.length - a.match.length
			}
			if (a.sta != b.sta) {
				return a.sta - b.sta
			}
			return b.end - a.end
		})

		this._segments.set(phrase, segments)
	}

	/**
	 * List all possible candidates for the added entries. The purpose of those
	 * is to be matched exactly when attempting to load.
	 */
	list_candidates() {
		const out = [...this._map.keys()]
		return out
	}

	// TODO: extract unmatched suffix to continue the search (e.g. prefix)
	// TODO: return position info for the match

	/**
	 * Deinflect all phrases in the list using the loaded list of candidate
	 * entries.
	 *
	 * All phrases must have been added through `add_phrase` beforehand and the
	 * entries loaded from the `list_candidates`.
	 */
	deinflect_all(entries: Entry[], full_text: string, phrases: string[]): Entry[] {
		// Map all entries that were loaded.
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

		const parsed = new Set<string>()
		const output: Array<{ position: number; entries: Entry[] }> = []
		for (const phrase of phrases) {
			if (parsed.has(phrase)) {
				continue
			}
			parsed.add(phrase)

			const pos = full_text.indexOf(phrase)
			let segments = this._segments.get(phrase) || []

			while (segments.length) {
				const segment = segments.shift()!

				// All candidates de-inflections for this segment
				const candidates = this._reverse_map.get(segment.match)
				if (!candidates || !candidates.length) {
					continue
				}

				const match = candidates
					.flatMap((candidate) => {
						const entries = (entries_map.get(candidate.term) || []).filter(
							(entry) => !candidate.rules.size || entry.has_rule_tag(candidate.rules),
						)
						return entries.length ? [{ candidate, entries }] : []
					})
					.sort((a, b) => {
						// Favor full deinflections or with smaller completed suffixes
						const partial = a.candidate.partial.length - b.candidate.partial.length
						if (partial != 0) {
							return partial
						}

						// prioritize the shortest number of rules applied
						const rules = a.candidate.reasons.length - b.candidate.reasons.length
						if (rules != 0) {
							return rules
						}

						// favor the shortest prefix (i.e. longest inflection)
						const shortest = a.candidate.prefix.length - b.candidate.prefix.length
						if (shortest != 0) {
							return shortest
						}

						// favor the least number of matching entries (more specific)
						return a.entries.length - b.entries.length
					})
					.shift()

				if (match) {
					const candidate = match.candidate
					const info = get_inflection_info(candidate.term, candidate.reasons, candidate.partial)
					const input_text = phrase.slice(segment.sta, segment.end)

					let matches = match.entries.map((x) =>
						x.with_match_info({
							mode: candidate.reasons.length ? 'deinflect' : 'exact',
							query: input_text,
							text: candidate.term,
							segments: info.prefix,
							inflected_suffix: info.suffix_pos,
							inflection_rules: candidate.reasons.map((x) => x.name),
						}),
					)

					// If this is a single kana input, limit the output to
					// matching kana-only entries
					if (kana.is_kana(input_text) && input_text.length == 1) {
						matches = matches.filter((x) => !x.kanji.length && x.reading[0].expr == input_text)
					}

					// Try to further limit the maching entries
					const filter_if = (cond: (e: Entry) => boolean) => {
						const aux = matches.filter(cond)
						if (aux.length > 0) {
							matches = aux
						}
					}

					filter_if((x) => (x.kanji[0] && x.kanji[0].expr == input_text) || x.reading[0].expr == input_text)

					if (matches.length) {
						output.push({
							position: pos + segment.sta,
							entries: matches,
						})

						segments = segments.filter((it) => it.end <= segment.sta || it.sta >= segment.end)
					}
				}
			}
		}

		const set = new Set<string>()
		return output
			.sort((a, b) => a.position - b.position)
			.flatMap((m) => {
				return m.entries.filter((x) => {
					if (set.has(x.id)) {
						return false
					}
					set.add(x.id)
					return true
				})
			})
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
				const info = get_inflection_info(expr, deinflect.reasons, deinflect.partial)

				return [
					entry.with_match_info({
						mode: 'deinflect',
						query: deinflect.source,
						text: expr,
						segments: info.prefix,
						inflected_suffix: info.suffix_pos,
						inflection_rules: deinflect.reasons.map((x) => x.name),
					}),
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

function get_inflection_info(expr: string, reasons: InflectionRule[], partial: string) {
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

	if (partial && suffix_pos.endsWith(partial)) {
		const p = suffix_pos.length - partial.length
		suffix_pos = suffix_pos.slice(0, p) + '.' + suffix_pos.slice(p)
	}

	return { prefix, suffix_pre, suffix_pos }
}
