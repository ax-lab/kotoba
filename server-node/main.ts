import * as fs from 'fs'

import { elapsed, now } from '../lib-ts'

import { word_count, words } from './dict/entries'
import { Entry } from './dict/entry'
import { Player } from './player'
import { start_server } from './server'

const START_SERVER = true

const DUMP_WORDS = false

async function main() {
	Player.events.on('exit', (error) => console.log('Player closed', error ? error : ''))

	if (DUMP_WORDS) {
		const start = now()
		const page_size = 1000
		const count = await word_count()
		const entries: Entry[] = []
		for (let i = 0; i < count; i += page_size) {
			const aux = await words({ offset: i, limit: page_size })
			entries.push(...aux)
		}
		console.log(`Loaded ${entries.length} words in ${elapsed(start)}. Writing...`)

		let char_count = 0
		let char_max = 0

		const size: number[] = []
		const text: string[] = []
		const push = (txt: string) => {
			char_count += txt.length
			char_max = Math.max(char_max, txt.length)
			text.push(txt)
			size.push(txt.length)
		}

		for (const word of entries) {
			for (const it of word.kanji) {
				push(it.expr)
			}
			for (const it of word.reading) {
				push(it.expr)
			}
		}

		size.sort((a, b) => a - b)

		const pc = (n: number) => {
			const pos = Math.floor((n / 100) * (size.length - 1))
			return `${n}%: ${size[pos]}`
		}

		const total_words = text.length
		text.unshift(
			`Total words: ${total_words} -- ${char_count} chars (avg: ${Math.round(
				char_count / total_words,
			)}, max: ${char_max}, ${pc(99)}, ${pc(95)}, ${pc(80)})`,
		)

		fs.writeFileSync('./testdata/wordlist.txt', text.join('\n'), 'utf-8')
	}

	if (START_SERVER) {
		start_server()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
