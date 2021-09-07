import { elapsed, kana, now } from '../../lib'
import { load_json_file } from '../../lib/files'

import { entries_exact, Entry } from './entries'

type InflectionRow = {
	kanaIn: string
	kanaOut: string
	rulesIn: string[]
	rulesOut: string[]
}

type InflectionTable = {
	[key: string]: InflectionRow[]
}

const RULES = (() => {
	const data = load_json_file<InflectionTable>('./data/grammar/deinflect.json')
	return Object.keys(data).flatMap((name) => data[name].map((x) => ({ ...x, name })))
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
	const all = candidates(word)
	const entries = await entries_exact(all.map((x) => x.input))
	const out = entries
		.flatMap((entry) => {
			for (const it of [...entry.kanji, ...entry.reading]) {
				const expr = kana.to_hiragana(it.expr)
				const rule = all.find((x) => expr == x.input)
				if (rule) {
					return [{ entry: entry.with_deinflect(rule.reasons), rule }]
				}
			}
			return []
		})
		.filter(({ entry, rule }) => {
			return !rule.rules.size || entry.has_rule_tag(rule.rules)
		})
		.map((x) => x.entry)
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

			segments.push({ match: hiragana, exact: !can_deinflect, sta: i, end: j })
		}
	}

	const all = new Set<string>()
	const candidate_map = new Map<string, Candidate[]>()
	for (const it of segments) {
		if (it.exact) {
			all.add(it.match)
		} else if (!candidate_map.has(it.match)) {
			const ls = candidates(it.match)
			candidate_map.set(it.match, ls)
			for (const word of ls) {
				all.add(word.input)
			}
		}
	}

	const entries = await entries_exact([...all])

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
			;(candidate_map.get(segment.match) || []).map((row) => {
				const entries = (entries_map.get(row.input) || [])
					.filter((x) => row.rules.size == 0 || x.has_rule_tag(row.rules))
					.map((x) => x.with_deinflect([...row.reasons]))
				matches.push(...entries)
			})
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

type Candidate = {
	input: string
	rules: Set<string>
	reasons: string[]
}

/**
 * Generate de-inflection candidates.
 */
function candidates(source: string): Candidate[] {
	// Based on https://github.com/FooSoft/yomichan/blob/f68ad1f843607d4ba1ad216fe16305c420cee8d6/ext/js/language/deinflector.js#L23

	const out = new Set<Candidate>()
	const queue: Candidate[] = [{ input: kana.to_hiragana(source), rules: new Set(), reasons: [] }]

	for (let i = 0; i < queue.length; i++) {
		const { input, rules, reasons } = queue[i]
		out.add({ input, rules, reasons })

		for (const rule of RULES) {
			const src = rule.kanaIn
			const dst = rule.kanaOut
			if (!input.endsWith(src) || input.length - src.length + dst.length <= 0) {
				continue
			}
			if (rules.size && !rule.rulesIn.some((x) => rules.has(x))) {
				continue
			}

			const next = input.slice(0, input.length - src.length) + dst
			queue.push({
				input: next,
				rules: new Set(rule.rulesOut),
				reasons: [rule.name, ...reasons],
			})
		}
	}

	return [...out]
}
