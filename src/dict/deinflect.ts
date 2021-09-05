import { kana } from '../../lib'
import { load_json_file } from '../../lib/files'

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

export function candidates(source: string) {
	const out = new Set<string>()
	const queue = [kana.to_hiragana(source)]

	while (queue.length) {
		const current = queue.shift()!
		out.add(current)

		for (const rule of RULES) {
			if (current.endsWith(rule.kanaIn)) {
				const next = current.slice(0, current.length - rule.kanaIn.length) + rule.kanaOut
				if (!out.has(next)) {
					out.add(next)
					queue.push(next)
				}
			}
		}
	}

	return [...out]
}
