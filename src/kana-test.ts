import * as fs from 'fs'

import { elapsed, now } from '../lib'
import { to_hiragana, to_katakana, to_romaji } from '../lib/kana'

const lines = fs.readFileSync('./testdata/wordlist.txt', 'utf-8').split('\n')
lines.shift()
console.log(`Loaded ${lines.length} lines`)

const text = lines.join('\n')
console.log(`Loaded ${text.length} chars`)

main()

function main() {
	run('to_hiragana (line)', 3, () => {
		for (const it of lines) {
			to_hiragana(it)
		}
	})

	run('to_hiragana (text)', 3, () => {
		to_hiragana(text)
	})

	run('to_katakana (line)', 3, () => {
		for (const it of lines) {
			to_katakana(it)
		}
	})

	run('to_romaji (line)', 3, () => {
		for (const it of lines) {
			to_romaji(it)
		}
	})

	run('to_romaji -> to_hiragana (line)', 3, () => {
		for (const it of lines) {
			to_hiragana(to_romaji(it))
		}
	})
}

function run(name: string, n: number, fn: () => void) {
	console.log(`Testing ${name}...`)

	for (let i = 0; i < n; i++) {
		const start = now()
		fn()
		console.log(`- Took ${elapsed(start)}`)
	}
}
