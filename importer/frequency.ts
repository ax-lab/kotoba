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
	/** Kanji or word for this entry. */
	entry: string

	/**
	 * Combined count from the innocent corpus and wordlex data sources.
	 *
	 * This is a plain sum of other frequency fields.
	 */
	frequency: number

	/** Raw count from the Innocent Corpus data source. */
	count_ic?: number

	/** Count per million of the Innocent Corpus data source. */
	frequency_ic?: number

	/** Count per million from the Worldlex blog data source. */
	frequency_blog?: number

	/** Count per million from the Worldlex news data. */
	frequency_news?: number

	/** Count per million from the Worldlex twitter data. */
	frequency_twitter?: number
}

/**
 * Frequency information from the Innocent Corpus database.
 */
export type InnocentCorpus = {
	/**
	 * Number of times the term appears in the corpus.
	 */
	count: number

	/**
	 * This is the normalized count per million for the word.
	 */
	frequency: number
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
		out.chars.push({ entry: it.entry, frequency: it.frequency, frequency_ic: it.frequency, count_ic: it.count })
	}
	for (const it of innocent_corpus.words) {
		out.word_map[it.entry] = out.words.length
		out.words.push({ entry: it.entry, frequency: it.frequency, frequency_ic: it.frequency, count_ic: it.count })
	}

	const append_worldlex = (list: WorldlexSrc[], output: FrequencyRow[], map: Record<string, number>) => {
		for (const it of list) {
			const index = map[it.entry]
			const count = it.blog_freq_pm + it.twitter_freq_pm + it.news_freq_pm
			const entry = index != null ? output[index] : { entry: it.entry, frequency: 0 }
			if (index == null) {
				map[it.entry] = output.length
				output.push(entry)
			}

			entry.frequency += count
			entry.frequency_blog = it.blog_freq_pm
			entry.frequency_news = it.news_freq_pm
			entry.frequency_twitter = it.twitter_freq_pm
		}
	}

	append_worldlex(wordlex.chars, out.chars, out.char_map)
	append_worldlex(wordlex.words, out.words, out.word_map)

	console.log(out.words.slice(0, 10))
	console.log(out.chars.slice(0, 10))

	console.log(
		`Loaded frequency information for ${out.words.length} words and ${out.chars.length} chars in ${lib.elapsed(
			start,
		)}`,
	)

	return out
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
					return { entry, count, frequency: 0 }
				},
			),
		)
	}

	// Compute the frequency per million for all entries in the list.
	const compute = (ls: InnocentCorpusSrc[]) => {
		// Compute the total count for all entries.
		const total = ls.map((x) => x.count).reduce((acc, it) => acc + it, 0)
		// We want the frequency per million entries.
		const millions = total / 1000000
		for (const it of ls) {
			it.frequency = it.count / millions
		}
	}

	compute(words)
	compute(kanji)

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

	const isn = (x: unknown) => typeof x == 'number' && !isNaN(x)
	const out = {
		words: words.map(map_fn).filter((x) => {
			const ok = isn(x.blog_freq) && isn(x.news_freq) && isn(x.twitter_freq)
			if (!ok) {
				return false
			}
			return x.entry != 'constructor'
		}),
		chars: chars.map(map_fn),
	}

	console.log(
		`Lexicon: loaded ${out.words.length} word and ${out.chars.length} char entries in ${lib.elapsed(start)}`,
	)
	return out
}
