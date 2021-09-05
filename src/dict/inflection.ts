import { elapsed, kana, now } from '../../lib'
import { load_json_file } from '../../lib/files'

import { entries_exact } from './entries'

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
					entry.deinflect = rule.reasons
					return [{ entry, rule }]
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

/**
 * Generate de-inflection candidates.
 */
function candidates(source: string) {
	type Entry = {
		input: string
		rules: Set<string>
		reasons: string[]
	}

	// Based on https://github.com/FooSoft/yomichan/blob/f68ad1f843607d4ba1ad216fe16305c420cee8d6/ext/js/language/deinflector.js#L23

	const out = new Set<Entry>()
	const queue: Entry[] = [{ input: kana.to_hiragana(source), rules: new Set(), reasons: [] }]

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
