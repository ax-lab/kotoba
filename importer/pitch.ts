import * as path from 'path'

import * as lib from '../lib-ts'
import { read_lines } from '../lib-ts/files'

const PITCH_FILE = 'accents.txt'

export type PitchMap = Record<
	string,
	Record<
		string,
		Array<{
			tags: string[]
			pitch: number
		}>
	>
>

export async function import_pitch(source_dir: string) {
	const start = lib.now()
	const lines = (await read_lines(path.join(source_dir, PITCH_FILE)))
		.filter((x) => !!x.trim())
		.map((x) => x.split(/\t/))

	const tag_map: Record<string, string> = {
		副: `adv`,
		名: `n`,
		代: `pn`,
		形動: `adj-na`,
		感: `int`,
	}

	const pitch: PitchMap = {}
	let line = 1
	for (const [word, read, list] of lines) {
		const pitches = list.split(',').map((x) => {
			const [tag_list, value] = x.startsWith('(') ? x.slice(1).split(')') : ['', x]
			const tags = tag_list
				? tag_list.split(';').map((tag) => {
						if (tag && !tag_map[tag]) {
							throw new Error(`invalid tag: ${tag} at ${line}: ${word} ${read} ${list}`)
						}
						return tag_map[tag]
				  })
				: []

			const pitch = parseInt(value, 10)
			if (typeof pitch != 'number' || isNaN(pitch)) {
				throw new Error(`invalid pitch: ${x} at ${line}: ${word} ${read} ${list}`)
			}
			return { tags, pitch }
		})
		pitch[word] = pitch[word] || {}
		pitch[word][read] = pitches
		line++
	}

	console.log(`Loaded pitch information for ${lines.length} entries in ${lib.elapsed(start)}`)

	return pitch
}
