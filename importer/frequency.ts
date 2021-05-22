import * as path from 'path'

import * as lib from '../lib'

import { open_zip, split_lines } from './files'

const INNOCENT = 'innocent_corpus.zip'
const WORDLEX = 'Jap.Freq.2.zip'

/**
 * Frequency information for words and characters.
 */
export type Frequency = {
	chars: FrequencyRow[]
	words: FrequencyRow[]

	char_map: Record<string, number>
	word_map: Record<string, number>
}

/**
 * Frequency information for a single entry.
 */
export type FrequencyRow = {
	entry: string
	innocent_corpus?: InnocentCorpus
	wordlex?: Wordlex
}

/**
 * Frequency information from the Innocent Corpus database.
 */
export type InnocentCorpus = {
	/**
	 * Number of times the term appears in the corpus.
	 */
	count: number
}

/**
 * Frequency information from the Worldlex database.
 */
export type Wordlex = {
	/**
	 * Number of times the term appears in the blog corpus.
	 */
	blog_freq: number

	/**
	 * Same as `blog_freq` but per million.
	 */
	blog_freq_pm: number

	/**
	 * Contextual diversity for the blog corpus. This is the number of source
	 * documents in which the term appears.
	 */
	blog_cd: number

	/**
	 * Percent value for `blog_cd` (0-100).
	 */
	blog_cd_pc: number

	/**
	 * Number of times the term appears in the Twitter corpus.
	 */
	twitter_freq: number

	/**
	 * Same as `twitter_freq` but per million.
	 */
	twitter_freq_pm: number

	/**
	 * Contextual diversity for the Twitter corpus. This is the number of source
	 * documents in which the term appears.
	 */
	twitter_cd: number

	/**
	 * Percent value for `twitter_cd` (0-100).
	 */
	twitter_cd_pc: number

	/**
	 * Number of times the term appears in the news corpus.
	 */
	news_freq: number

	/**
	 * Same as `news_freq` but per million.
	 */
	news_freq_pm: number

	/**
	 * Contextual diversity for the news corpus. This is the number of source
	 * documents in which the term appears.
	 */
	news_cd: number

	/**
	 * Percent value for `news_cd` (0-100).
	 */
	news_cd_pc: number
}

type InnocentCorpusSrc = { entry: string } & InnocentCorpus
type WorldlexSrc = { entry: string } & Wordlex

export async function import_frequencies(source_dir: string) {
	const start = lib.now()
	const innocent_op = import_innocent_corpus(path.join(source_dir, INNOCENT))
	const wordlex_op = import_worldlex(path.join(source_dir, WORDLEX))

	const innocent_corpus = await innocent_op
	const wordlex = await wordlex_op

	const out: Frequency = {
		chars: [],
		words: [],
		char_map: {},
		word_map: {},
	}

	for (const it of innocent_corpus.chars) {
		out.char_map[it.entry] = out.chars.length
		out.chars.push({ entry: it.entry, innocent_corpus: remove_entry(it) })
	}
	for (const it of innocent_corpus.words) {
		out.word_map[it.entry] = out.words.length
		out.words.push({ entry: it.entry, innocent_corpus: remove_entry(it) })
	}

	for (const it of wordlex.chars) {
		const index = out.char_map[it.entry]
		const data = remove_entry(it)
		if (index != null) {
			out.chars[index].wordlex = data
		} else {
			out.char_map[it.entry] = out.chars.length
			out.chars.push({ entry: it.entry, wordlex: data })
		}
	}
	for (const it of wordlex.words) {
		const index = out.word_map[it.entry]
		const data = remove_entry(it)
		if (index != null) {
			if (!out.words[index]) console.log(index, it.entry, String(index), out.words[index])
			out.words[index].wordlex = data
		} else {
			out.word_map[it.entry] = out.words.length
			out.words.push({ entry: it.entry, wordlex: data })
		}
	}

	console.log(
		`Loaded frequency information for ${out.words.length} words and ${out.chars.length} chars in ${lib.elapsed(
			start,
		)}`,
	)

	console.log(out.words.slice(0, 10))
	console.log(out.chars.slice(0, 10))

	return out

	function remove_entry<T>(input: T): Omit<T, 'entry'> {
		const row = { ...input }
		delete ((row as unknown) as Record<string, string>).entry
		return row
	}
}

async function import_innocent_corpus(filename: string) {
	const start = lib.now()
	const zip = await open_zip(filename)
	const words: Array<InnocentCorpusSrc> = []
	const kanji: Array<InnocentCorpusSrc> = []
	for (const [name, file] of Object.entries(zip.files).sort((a, b) => a[0].localeCompare(b[0]))) {
		if (!name.endsWith('.json')) {
			continue
		}

		const is_kanji = name.startsWith('kanji_meta')
		let lines: Array<[string, string, number]> | null = []
		if (is_kanji || name.startsWith('term_meta')) {
			lines = JSON.parse(await file.async('string')) as Array<[string, string, number]>
		}

		;(is_kanji ? kanji : words).push(
			...lines.map(
				(row): InnocentCorpusSrc => {
					const [entry, , count] = row
					return { entry, count }
				},
			),
		)
	}

	const out = {
		words: words,
		chars: kanji,
	}
	console.log(`Corpus: loaded ${words.length} word and ${kanji.length} kanji entries in ${lib.elapsed(start)}`)
	return out
}

async function import_worldlex(filename: string) {
	const start = lib.now()
	const zip = await open_zip(filename)
	const words = split_lines(await zip.files['Jap.Freq.2.txt'].async('string')).map((x) => x.split('\t'))
	const chars = split_lines(await zip.files['Jap.Char.Freq.2.txt'].async('string')).map((x) => x.split('\t'))

	words.shift()
	chars.shift()

	const num = (value: string) => parseFloat(value)
	const map_fn = (row: string[]): WorldlexSrc => {
		const [
			entry,
			blog_freq,
			blog_freq_pm,
			blog_cd,
			blog_cd_pc,
			twitter_freq,
			twitter_freq_pm,
			twitter_cd,
			twitter_cd_pc,
			news_freq,
			news_freq_pm,
			news_cd,
			news_cd_pc,
		] = row
		return {
			entry,
			blog_freq: num(blog_freq),
			blog_freq_pm: num(blog_freq_pm),
			blog_cd: num(blog_cd),
			blog_cd_pc: num(blog_cd_pc),
			twitter_freq: num(twitter_freq),
			twitter_freq_pm: num(twitter_freq_pm),
			twitter_cd: num(twitter_cd),
			twitter_cd_pc: num(twitter_cd_pc),
			news_freq: num(news_freq),
			news_freq_pm: num(news_freq_pm),
			news_cd: num(news_cd),
			news_cd_pc: num(news_cd_pc),
		}
	}

	const out = {
		words: words.map(map_fn).filter((x) => x.entry != 'constructor'),
		chars: chars.map(map_fn),
	}
	console.log(
		`Lexicon: loaded ${out.words.length} word and ${out.chars.length} char entries in ${lib.elapsed(start)}`,
	)
	return out
}
