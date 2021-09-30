import * as path from 'path'

import { kana } from '../lib-ts'
import { read_text } from '../lib-ts/files'

const JLPT_JSON = 'jlpt.json'

export type Map = {
	[1]: LevelMap
	[2]: LevelMap
	[3]: LevelMap
	[4]: LevelMap
	[5]: LevelMap
}

export type Vocab = {
	terms: string[]
	reads: string[]
	line: string

	// Some entries are manually mapped to sequences in the dictionary.
	sequence?: string
}

export type LevelMap = {
	kanji: string[]
	vocab: Vocab[]
}

type MapRaw = {
	[1]: LevelMapRaw
	[2]: LevelMapRaw
	[3]: LevelMapRaw
	[4]: LevelMapRaw
	[5]: LevelMapRaw
}

type LevelMapRaw = {
	kanji: string[]
	vocab: string[]
}

const RE_WORD = /^[\p{L}\p{N}]+$/u

export function parse_vocab(line: string): Vocab | undefined {
	const [term_raw, read] = line.split(': ', 2)
	const [sequence_raw, suffix] = term_raw.split('!')
	const term = suffix ? suffix.trim() : term_raw
	const sequence = suffix ? sequence_raw.trim() : undefined

	const RE_SPLIT = /[\s/]+/i
	const terms = term.split(RE_SPLIT).filter((x) => !!x)
	const reads = read.split(RE_SPLIT).filter((x) => !!x)

	if (
		Array.from(terms)
			.concat(reads)
			.some((x) => !RE_WORD.test(x))
	) {
		console.log(`WARN: line has invalid words: ${line}`)
		return
	}

	if (reads.length + terms.length == 0) {
		console.log(`WARN: line is empty: ${line}`)
		return
	}

	// check for a kana-only entry
	if (!reads.length) {
		reads.push(...terms)
		terms.length = 0
	}

	// for some entries the term/reading is duplicated.
	if (reads.join(',') == terms.join(',')) {
		terms.length = 0
	}

	if (reads.some((x) => !kana.is_kana(x))) {
		console.log(`WARN: line readings are invalid: ${line}`)
		return
	}

	return { terms, reads, sequence, line }
}

export async function import_jlpt(source_dir: string) {
	console.log('\n==> Import JLPT data...')

	const json = await read_text(path.join(source_dir, JLPT_JSON))
	const data = JSON.parse(json) as MapRaw

	const kanji_map: Record<string, string> = {}
	const vocab_map: Record<string, string> = {}

	let kanji_count = 0
	let vocab_count = 0

	const check = (level: string, m: LevelMapRaw): LevelMap => {
		kanji_count += m.kanji.length
		vocab_count += m.vocab.length
		for (const kanji of m.kanji) {
			if (!RE_WORD.test(kanji)) {
				console.log(`WARN: ${level} kanji ${kanji} is not valid`)
			}
			if (kanji_map[kanji]) {
				console.log(`WARN: ${level} kanji ${kanji} is duplicated with ${kanji_map[kanji]}`)
			}
			kanji_map[kanji] = level
		}

		const vocab: Vocab[] = []
		for (const row of m.vocab) {
			const entry = parse_vocab(row)
			if (!entry) continue
			for (const it of entry.terms.length ? entry.terms : entry.reads) {
				const key = `${entry.terms.join(',')}=${entry.reads.join(',')}`
				const existing = vocab_map[key]
				if (existing && existing != level) {
					console.log(`WARN: ${level} vocab '${key}' is duplicated with ${existing}`)
				}
				vocab_map[it] = level
			}
			vocab.push(entry)
		}

		console.log(`... Loaded ${level} with ${m.kanji.length} kanji and ${m.vocab.length} vocabs`)
		return {
			kanji: m.kanji,
			vocab: vocab,
		}
	}

	const out: Map = {
		[5]: check('N5', data[5]),
		[4]: check('N4', data[4]),
		[3]: check('N3', data[3]),
		[2]: check('N2', data[2]),
		[1]: check('N1', data[1]),
	}

	console.log(`--> Loaded ${kanji_count} kanji and ${vocab_count} vocabs for JLPT\n`)

	return out
}
