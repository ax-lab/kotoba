import fs from 'fs'
import path from 'path'

import sqlite from 'sqlite3'

import * as lib from '../lib'
import { kana } from '../lib'
import { file_exists, remove_file } from '../lib/files'

import { Frequency, import_frequencies } from './frequency'
import * as jlpt from './jlpt'
import * as jmdict from './jmdict'
import * as kanjidic from './kanjidic'
import * as kirei from './kirei'
import { import_pitch, PitchMap } from './pitch'

const DICT_DATABASE = 'dict.db'
const KANJI_DATABASE = 'kanji.db'

const DICT_FILE = 'jmdict_english.zip'
const KANJIDIC_FILE = 'kanjidic2.zip'
const KIREI_CAKE = 'kirei-cake.html.txt'

const DATA_SRC_DIR = path.join(__dirname, '..', 'data', 'source')
const DATA_OUT_DIR = path.join(__dirname, '..', 'data')

const check_data = () => {
	const stat = fs.statSync(DATA_SRC_DIR)
	if (!stat || !stat.isDirectory()) {
		console.error('Fatal error: data source directory not found')
		return false
	}
	return true
}

async function main() {
	if (!check_data()) {
		return
	}
	console.log(`- Data source directory is ${DATA_SRC_DIR}`)
	console.log(`- Data output directory is ${DATA_OUT_DIR}`)

	const jlpt_map = await jlpt.import_jlpt(DATA_SRC_DIR)

	const pitch = await import_pitch(DATA_SRC_DIR)
	const frequencies = await import_frequencies(DATA_SRC_DIR)

	const db_kanji = path.join(DATA_OUT_DIR, KANJI_DATABASE)
	if (!(await file_exists(db_kanji))) {
		console.log('\n#====================== Generating kanji.db ======================#\n')
		await generate_kanji(db_kanji, frequencies, jlpt_map)
	} else {
		console.log(`\n- File ${db_kanji} already exists, skipping.`)
	}

	const db_dict = path.join(DATA_OUT_DIR, DICT_DATABASE)
	if (!(await file_exists(db_dict))) {
		console.log('\n#====================== Generating dict.db ======================#\n')
		await generate_dict(db_dict, frequencies, pitch, jlpt_map)
	} else {
		console.log(`\n- File ${db_dict} already exists, skipping.`)
	}
}

async function generate_kanji(db_file: string, frequencies: Frequency, jlpt_map: jlpt.Map) {
	const entries = await kanjidic.import_entries(path.join(DATA_SRC_DIR, KANJIDIC_FILE))

	console.log(`Writing Kanji database to ${db_file}\n`)
	await remove_file(db_file)

	const start = lib.now()
	const db = new DB(db_file)
	await db.exec('PRAGMA journal_mode = MEMORY')
	await db.exec(`
		CREATE TABLE dictionaries (
			name  TEXT PRIMARY KEY,
			label TEXT
		);

		CREATE TABLE kanji (
			character     TEXT PRIMARY KEY,
			grade         NUMBER,
			frequency     NUMBER, -- Frequency per million for this kanji.
			ranking       NUMBER, -- Value from 1 to 2500 for the 2500 most frequent used kanji
			old_jlpt      NUMBER, -- Old JLPT levels from 1 to 4
			jlpt          NUMBER, -- Value from 1 to 5

			radicals      TEXT,   -- CSV list of radical names for this kanji (hiragana)
			nanori        TEXT,   -- CSV list of Japanese readings now only associated with names

			stroke        NUMBER, -- official stroke count
			stroke_min    NUMBER, -- minimum stroke count considering extras
			stroke_max    NUMBER, -- maximum stroke count considering extras
			stroke_all    TEXT    -- CSV list of extra common stroke miscounts
		);

		CREATE TABLE kanji_radical(
			character     TEXT,
			type          TEXT,
			radical       INT,
			PRIMARY KEY (character, type, radical)
		);

		CREATE TABLE kanji_variant(
			character     TEXT,
			variant       TEXT,
			type          TEXT,
			PRIMARY KEY (character, variant, type)
		);
		CREATE INDEX idx_kanji_variant ON kanji_variant (character);

		CREATE TABLE kanji_query_code(
			character     TEXT,
			type          TEXT,
			value         TEXT,
			misclass      TEXT,
			PRIMARY KEY (character, type, value, misclass)
		);
		CREATE INDEX idx_kanji_query_code_character ON kanji_query_code (character);
		CREATE INDEX idx_kanji_query_code_lookup    ON kanji_query_code (type, value);

		CREATE TABLE kanji_reading(
			character     TEXT,
			sequence      INT,
			type          TEXT,
			value         TEXT,
			PRIMARY KEY (character, sequence, type, value)
		);
		CREATE INDEX idx_kanji_reading ON kanji_reading (character);

		CREATE TABLE kanji_meaning(
			character     TEXT,
			sequence      INT,
			lang          TEXT,
			value         TEXT,
			PRIMARY KEY (character, sequence, lang, value)
		);
		CREATE INDEX idx_kanji_meaning_character ON kanji_meaning (character);
		CREATE INDEX idx_kanji_meaning_lookup    ON kanji_meaning (value COLLATE NOCASE);

		CREATE TABLE kanji_dict(
			character     TEXT,
			name          TEXT,
			text          TEXT,
			PRIMARY KEY (character, name, text)
		);
		CREATE INDEX idx_kanji_dict ON kanji_dict (character);

		CREATE TABLE kanji_frequency(
			character             TEXT PRIMARY KEY,
			frequency             NUMBER,
			count_ic              NUMBER,
			frequency_ic          NUMBER,
			frequency_blog        NUMBER,
			frequency_news        NUMBER,
			frequency_twitter     NUMBER
		);
		CREATE INDEX idx_kanji_frequency ON kanji_frequency (character);
	`)

	const SEP = ','

	const dict = kanjidic.KANJI_ENTRY_DICT_NAMES
	const tb_dictionaries = Object.keys(dict)
		.sort()
		.map((name) => ({ name, label: dict[name] }))

	const get_frequency = (character: string) => {
		const index = frequencies.char_map[character]
		if (index != null) {
			return frequencies.chars[index]
		}
		return
	}

	const tb_kanji = entries.map((row) => ({
		character: row.literal,
		grade: row.grade,
		frequency: get_frequency(row.literal)?.frequency || null,
		ranking: row.ranking,
		old_jlpt: row.old_jlpt,
		jlpt: null as null | number,
		radicals: row.radical_names.join(SEP),
		nanori: row.nanori.join(SEP),
		stroke: row.stroke_count[0],
		stroke_max: Math.max(...row.stroke_count),
		stroke_min: Math.min(...row.stroke_count),
		stroke_all: row.stroke_count.join(','),
	}))

	const index_by_kanji = new Map(tb_kanji.map((it, index) => [it.character, index]))
	const apply_jlpt = (level: number, kanji: string[]) => {
		for (const it of kanji) {
			const index = index_by_kanji.get(it)
			if (index != null) {
				tb_kanji[index].jlpt = level
			} else {
				console.log(`WARN: kanji ${it} from N${level} not found in database`)
			}
		}
	}
	apply_jlpt(5, jlpt_map[5].kanji)
	apply_jlpt(4, jlpt_map[4].kanji)
	apply_jlpt(3, jlpt_map[3].kanji)
	apply_jlpt(2, jlpt_map[2].kanji)
	apply_jlpt(1, jlpt_map[1].kanji)

	const total_frequency = tb_kanji.filter((x) => x.frequency).length
	tb_kanji.sort((a, b) => {
		const rank_a = a.ranking || 99999
		const rank_b = b.ranking || 99999
		if (rank_a != rank_b) {
			return rank_a - rank_b
		}
		return (b.frequency || 0) - (a.frequency || 0)
	})

	const tb_kanji_frequency = tb_kanji
		.filter((x) => x.frequency)
		.map((row) => {
			const f = get_frequency(row.character)!
			return {
				character: row.character,
				frequency: f.frequency,
				count_ic: f.count_ic,
				frequency_ic: f.frequency_ic,
				frequency_blog: f.frequency_blog,
				frequency_news: f.frequency_news,
				frequency_twitter: f.frequency_twitter,
			}
		})
	console.log(`Mapped frequency information for ${total_frequency} of ${tb_kanji.length} kanji`)

	const tb_kanji_radical = entries.flatMap((row) =>
		row.radicals.map((rad) => ({
			character: row.literal,
			type: rad.type,
			radical: rad.value,
		})),
	)

	const tb_kanji_variant = entries.flatMap((row) =>
		row.variant.map((v) => ({
			character: row.literal,
			variant: v.type == 'ucs' ? String.fromCodePoint(parseInt(v.value, 16)) : v.value,
			type: v.type,
		})),
	)

	const tb_kanji_query_code = entries.flatMap((row) =>
		row.query_codes.map((q) => ({
			character: row.literal,
			type: q.type,
			value: q.value,
			misclass: q.type == 'skip' ? q.skip_misclass : undefined,
		})),
	)

	const tb_kanji_reading = entries.flatMap((row) =>
		row.readings_meanings.flatMap((group, sequence) =>
			group.readings.map((r) => ({
				character: row.literal,
				sequence: sequence,
				type: r.type,
				value: r.value,
			})),
		),
	)

	const tb_kanji_meaning = entries.flatMap((row) =>
		row.readings_meanings.flatMap((group, sequence) =>
			group.meanings.map((m) => ({
				character: row.literal,
				sequence: sequence,
				lang: m.lang,
				value: m.text,
			})),
		),
	)

	const tb_kanji_dict = entries.flatMap((row) =>
		row.dict.map((dict) => ({
			character: row.literal,
			name: dict.name,
			text: dict.text,
		})),
	)

	await db.insert('dictionaries', tb_dictionaries)
	await db.insert('kanji', tb_kanji)
	await db.insert('kanji_frequency', tb_kanji_frequency)
	await db.insert('kanji_radical', tb_kanji_radical)
	await db.insert('kanji_variant', tb_kanji_variant)
	await db.insert('kanji_query_code', tb_kanji_query_code)
	await db.insert('kanji_reading', tb_kanji_reading)
	await db.insert('kanji_meaning', tb_kanji_meaning)
	await db.insert('kanji_dict', tb_kanji_dict)

	await db.close()
	console.log(`\nGenerated database in ${lib.elapsed(start)}`)
}

async function generate_dict(db_file: string, frequencies: Frequency, pitch: PitchMap, jlpt_map: jlpt.Map) {
	// Import main entries from JMDict.
	const jm_data = await jmdict.import_entries(path.join(DATA_SRC_DIR, DICT_FILE))

	const entries = jm_data.entries

	// Import additional entries from Kirei Cake.
	const kirei_cake = path.join(DATA_SRC_DIR, KIREI_CAKE)
	const kirei_entries = await kirei.import_entries(kirei_cake, jm_data.tags)
	console.log(`\n>>> Imported ${kirei_entries.length} Kirei Cake entries`)

	const TAG_KIREI = 'kirei'
	const tags: Record<string, string> = { ...kirei.TAGS, ...jm_data.tags, [TAG_KIREI]: 'From Kirei Cake' }

	// Map existing entries from the JMDict data so we can merge with Kirei Cake
	const entries_index: Record<string, number> = {}
	entries.forEach((it, index) => {
		// Map each kanji variation with its readings
		for (const k of it.kanji) {
			for (const r of it.reading) {
				if (r.restrict.length) {
					continue // restricted readings are mapped below
				}
				entries_index[`${k.expr}||${r.expr}`] = index
			}
		}
		// Map restricted readings and entries without a kanji element.
		for (const r of it.reading) {
			for (const expr of r.restrict) {
				entries_index[`${expr}||${r.expr}`] = index
			}
			if (!it.kanji.length) {
				entries_index[`${r.expr}`] = index
			}
		}
	})

	// Merge the Kirei Cake entries to the JSDict format.
	const kirei_sequence = 5000000
	let new_entries = 0
	let cur_entries = 0
	for (const [pos, it] of kirei_entries.entries()) {
		const entry = [it.expr, it.kana].filter((x) => !!x)
		const index = entries_index[`${entry.join('||')}`]
		if (index == null) {
			// Append a new entry directly
			new_entries++
			entries.push({
				sequence: (kirei_sequence + pos).toString(),
				kanji: !it.expr
					? []
					: [
							{
								expr: it.expr,
								info: it.tags || [],
								priority: [],
							},
					  ],
				reading: [
					{
						expr: it.kana,
						info: it.expr ? [] : it.tags || [],
						priority: [],
						restrict: [],
						pitches: [],
					},
				],
				sense: [
					{
						misc: [TAG_KIREI],
						glossary: it.sense.map((x) => ({ text: x })),
					},
				],
			})
		} else {
			// For an existing entry, add a sense.
			cur_entries++
			entries[index].sense.push({
				misc: [TAG_KIREI],
				glossary: it.sense.map((x) => ({ text: x })),
			})
		}
	}
	console.log(`Merged ${new_entries} new and ${cur_entries} existing entries from Kirei Cake`)

	const entries_index_rows: Array<{ kanji: string; reading: string; sequence: string }> = []
	entries.forEach((it) => {
		const sequence = it.sequence

		// Map each kanji variation with its readings
		for (const k of it.kanji) {
			for (const r of it.reading) {
				if (r.restrict.length) {
					continue // restricted readings are mapped below
				}
				entries_index_rows.push({ sequence, kanji: k.expr, reading: r.expr })
			}
		}
		// Map restricted readings and entries without a kanji element.
		for (const r of it.reading) {
			for (const expr of r.restrict) {
				entries_index_rows.push({ sequence, kanji: expr, reading: r.expr })
			}
			if (!it.kanji.length) {
				entries_index_rows.push({ sequence, kanji: '', reading: r.expr })
			}
		}
	})

	console.log('\n>>> Merging JLPT data...')

	// Index all main entries and readings for words in the dictionary.
	console.log('... indexing')
	const index_by_term = new Map<string, Set<number>>()
	const index_by_read = new Map<string, Set<number>>()
	const index_by_code = new Map<string, number>()
	entries.forEach((it, index) => {
		index_by_code.set(it.sequence, index)

		// Index the main term. This is usually the kanji, but for kana-only
		// terms we index the kana.
		const terms = it.kanji.length ? it.kanji : it.reading
		for (const row of terms) {
			const expr = row.expr
			const set = index_by_term.get(expr) || new Set()
			if (!set.size) {
				index_by_term.set(expr, set)
			}
			set.add(index)
		}

		// For entries that have only the reading, we fallback to the reading
		// index.
		for (const row of it.reading) {
			const expr = row.expr
			const set = index_by_read.get(expr) || new Set()
			if (!set.size) {
				index_by_read.set(expr, set)
			}
			set.add(index)
		}
	})

	console.log('... merging')
	const merge_jlpt = (level: number, list: jlpt.Vocab[]) => {
		const filter_if = (ls: number[], predicate: (x: number) => unknown) => {
			if (ls.length > 1) {
				const aux = ls.filter(predicate)
				if (aux.length > 0) {
					return aux
				}
			}
			return ls
		}

		const output_entries = (ls: Iterable<number>) => {
			for (const index of ls) {
				const row = entries[index]
				console.log(
					`   ${row.sequence} ${row.kanji.map((x) => x.expr).join('／')}「${row.reading
						.map((x) => x.expr)
						.join('／')}」：${row.sense.map((x) => x.glossary.map((x) => x.text).join(', ')).join(' | ')}`,
				)
			}
		}

		let count = 0
		for (const row of list) {
			const ids = new Set<number>()

			if (row.sequence) {
				if (row.sequence != '0') {
					entries[index_by_code.get(row.sequence)!].jlpt = level
					count++
				}
				continue
			}

			const raw_line = row.line

			// If the term has a kanji reading we always use it to index,
			// otherwise we would be getting false positives because of similar
			// homophones readings.
			if (row.terms.length) {
				for (const kanji of row.terms) {
					const src = index_by_term.get(kanji)
					if (src) {
						let ls = Array.from(src.values())

						// If the kanji entry is ambiguous, we try to match
						// the proper reading.
						ls = filter_if(ls, (x) => entries[x].reading.some((x) => row.reads.includes(x.expr)))

						if (ls.length > 1) {
							console.log(`WARN: N${level} entry matches ${ls.length} rows -- ${kanji} (${raw_line})`)
							output_entries(ls)
							continue
						}

						for (const index of ls) {
							ids.add(index)
						}
					}
				}
			} else {
				// Do the reverse indexing for the readings.
				for (const read of row.reads) {
					const src = index_by_read.get(read)
					if (src) {
						if (src.size > 1) {
							console.log(`WARN: N${level} entry matches ${src.size} rows -- ${read} (${raw_line})`)
							output_entries(src)
							continue
						}

						for (const id of src) {
							ids.add(id)
						}
					}
				}
			}

			if (ids.size) {
				count++
				for (const index of ids) {
					entries[index].jlpt = level
				}
			} else {
				console.log(`WARN: N${level} entry has no match (${raw_line})`)
			}
		}
		console.log(`... merged ${count} entries for N${level}`)
	}

	merge_jlpt(1, jlpt_map[1].vocab)
	merge_jlpt(2, jlpt_map[2].vocab)
	merge_jlpt(3, jlpt_map[3].vocab)
	merge_jlpt(4, jlpt_map[4].vocab)
	merge_jlpt(5, jlpt_map[5].vocab)

	const tb_entries_index = entries_index_rows.map((x) => ({ ...x, hiragana: kana.to_hiragana(x.reading) }))

	const all_words = new Set<string>()

	console.log(`\n>>> Merging pitch information...`)
	let pitch_count = 0
	for (const row of entries) {
		for (const read of row.reading) {
			const exists: Record<string, boolean> = {}
			const entries: string[] = []

			const push = (main: string, read: string) => {
				const mp = pitch[main]
				const ls = (mp && mp[read]) || []
				for (const it of ls) {
					const row = `${it.pitch}:${it.tags.join(',')}`
					if (!exists[row]) {
						entries.push(row)
						exists[row] = true
					}
				}
			}

			if (read.restrict.length) {
				for (const kanji of read.restrict) {
					push(kanji, read.expr)
				}
			} else if (row.kanji.length > 0) {
				for (const kanji of row.kanji) {
					push(kanji.expr, read.expr)
				}
			} else {
				push(read.expr, '')
			}

			read.pitches = entries
			pitch_count += entries.length
		}
	}
	console.log(`... Merged ${pitch_count} pitch entries`)

	console.log(`\n>>> Building index map from entries...`)
	const map_entries = entries.flatMap((entry) => {
		const sequence = entry.sequence
		const words: Record<string, boolean> = {}
		for (const row of entry.kanji) {
			words[row.expr] = true
			all_words.add(row.expr)
		}
		for (const row of entry.reading) {
			words[row.expr] = true
			all_words.add(row.expr)
		}
		return Object.keys(words).map((expr) => ({ sequence, expr }))
	})

	console.log(`... Collected ${map_entries.length} map entries. Indexing...`)

	const start_index = lib.now()
	const tb_entries_map = map_entries.map((it, i) => {
		const num = i + 1
		const hiragana = kana.to_hiragana(it.expr).toUpperCase() // Used for exact matches on hiragana
		const hiragana_rev = [...hiragana].reverse().join('')
		const keyword = kana.to_hiragana_key(it.expr) // Used for fuzzy matching

		const chars = [...keyword]
		const keyword_rev = chars.reverse().join('')

		const keyword_set = [...new Set(chars)].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('')

		const final = num == map_entries.length
		if (num % 25000 == 0 || final) {
			const delta = lib.now() - start_index
			const rate = (num / (delta / 1000)).toFixed(0)
			const time = lib.duration(delta / num)
			console.log(`${final ? '---' : '...'} ${num} rows processed (${rate} per sec / ${time} per row)`)
		}
		return { ...it, hiragana, hiragana_rev, keyword, keyword_rev, keyword_set }
	})

	console.log(`Writing database to ${db_file}\n`)
	await remove_file(db_file)

	const sep = jmdict.LIST_SEPARATOR

	// TODO: index kanji/reading unique pairs to their own table

	const start_db = lib.now()
	const db = new DB(db_file)
	await db.exec('PRAGMA journal_mode = MEMORY')
	await db.exec(`
		CREATE TABLE tags (
			name  TEXT PRIMARY KEY,
			label TEXT
		);

		CREATE TABLE entries (
			sequence       TEXT PRIMARY KEY,
			frequency      NUMBER,
			popular        INT,
			rank           NUMBER, -- Frequency based rank
			position       NUMBER, -- Global position for this entry
			jlpt           NUMBER
		);

		CREATE TABLE entries_index(
			kanji          TEXT,
			reading        TEXT,
			hiragana       TEXT,
			sequence       TEXT,
			PRIMARY KEY (kanji, reading, sequence)
		);

		CREATE TABLE entries_kanji (
			sequence       TEXT,
			pos            INT,
			expr           TEXT,
			info           TEXT,
			priority       TEXT,
			popular        INT,
			frequency      NUMBER,
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_reading (
			sequence       TEXT,
			pos            INT,
			expr           TEXT,
			no_kanji       INT,
			info           TEXT,
			priority       TEXT,
			restrict       TEXT,
			popular        INT,
			frequency      NUMBER,
			pitches        TEXT,     -- Semi-colon separated list of pitches
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_sense (
			sequence        TEXT,
			pos             INT,
			stag_kanji      TEXT,
			stag_reading    TEXT,
			part_of_speech  TEXT,
			dialect         TEXT,
			xref            TEXT,
			antonym         TEXT,
			field           TEXT,
			misc            TEXT,
			info            TEXT,
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_sense_source (
			sequence        TEXT,
			pos             INT,
			elem            INT,
			text            TEXT,
			lang            TEXT,
			partial         INT,
			wasei           INT,
			PRIMARY KEY (sequence, pos, elem)
		);

		CREATE TABLE entries_sense_glossary (
			sequence        TEXT,
			pos             INT,
			elem            INT,
			text            TEXT,
			type            TEXT,
			PRIMARY KEY (sequence, pos, elem)
		);

		CREATE TABLE entries_map(
			sequence        TEXT,  -- sequence in the 'entries' table
			expr            TEXT,  -- indexed expression from the source

			hiragana        TEXT,  -- 'expr' simply converted to hiragana
			hiragana_rev    TEXT,  -- 'hiragana' reversed for suffix lookup
			keyword         TEXT,  -- 'expr' stripped to a indexable key
			keyword_rev     TEXT,  -- 'keyword' reversed for suffix lookup
			keyword_set     TEXT   -- char set in 'keyword' sorted by codepoint
		);

		CREATE TABLE word_frequency(
			word                  TEXT PRIMARY KEY,
			frequency             NUMBER,
			count_ic              NUMBER,
			frequency_ic          NUMBER,
			frequency_blog        NUMBER,
			frequency_news        NUMBER,
			frequency_twitter     NUMBER
		);
	`)

	const get_frequency = (word: string) => {
		const index = frequencies.word_map[word]
		if (index != null) {
			return frequencies.words[index]
		}
		return
	}

	const is_popular = (priority: string[]) => priority.some((x) => /^((news|ichi|spec|gai)1|spec2)$/.test(x))

	const tb_entries = entries.map((x) => ({
		sequence: x.sequence,
		jlpt: x.jlpt,
		popular: x.kanji.some((x) => is_popular(x.priority)) || x.reading.some((x) => is_popular(x.priority)),

		// The frequency for the row is the max frequency for all entries. We
		// use only the kanji when available because the reading is ambiguous
		// between many words.
		frequency: (x.kanji.length ? x.kanji : x.reading)
			.map((x) => get_frequency(x.expr))
			.filter((x) => !!x)
			.map((x) => x!.frequency)
			.reduce((acc, v) => Math.max(acc, v), 0),

		// This provides a global position that also takes into account popular
		// entries.
		position: 0,

		rank: null as number | null,
	}))

	const compare_freq = (a: { frequency: number; sequence: string }, b: { frequency: number; sequence: string }) => {
		const freq_a = a.frequency
		const freq_b = b.frequency
		if (freq_a != freq_b) {
			return freq_b - freq_a
		}
		return a.sequence.localeCompare(b.sequence)
	}

	// Apply the rank based on frequency for each entry
	let ranked = 0
	tb_entries.sort(compare_freq)
	tb_entries
		.filter((x) => x.frequency > 0)
		.forEach((it, index) => {
			ranked++
			it.rank = index + 1
		})

	// The actual sort order takes the popular field into account
	tb_entries.sort((a, b) => {
		if (a.popular != b.popular) {
			return a.popular ? -1 : +1
		}
		return compare_freq(a, b)
	})

	const sequence_position = new Map<string, number>()

	tb_entries.forEach((it, index) => {
		it.position = index + 1
		sequence_position.set(it.sequence, it.position)
	})

	tb_entries_map.sort((a, b) => {
		const pa = sequence_position.get(a.sequence)!
		const pb = sequence_position.get(b.sequence)!
		return pa - pb
	})

	const tb_tags = Object.keys(tags)
		.sort()
		.map((name) => ({ name, label: tags[name] }))

	const tb_word_frequency = Array.from(all_words.values())
		.map((word) => ({ word, row: get_frequency(word) }))
		.filter((x) => x.row)
		.map(({ word, row }) => {
			return {
				word: word,
				frequency: row!.frequency,
				count_ic: row!.count_ic,
				frequency_ic: row!.frequency_ic,
				frequency_blog: row!.frequency_blog,
				frequency_news: row!.frequency_news,
				frequency_twitter: row!.frequency_twitter,
			}
		})
	tb_word_frequency.sort((a, b) => b.frequency - a.frequency)
	console.log(
		`Mapped frequency information for ${ranked} of ${tb_entries.length} entries and ${tb_word_frequency.length} words`,
	)

	const tb_kanji = entries.flatMap((x) => {
		return x.kanji.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			expr: row.expr,
			info: row.info.join(sep),
			priority: row.priority.join(sep),
			popular: is_popular(row.priority),
			frequency: get_frequency(row.expr)?.frequency,
		}))
	})

	const tb_readings = entries.flatMap((x) => {
		return x.reading.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			expr: row.expr,
			no_kanji: row.no_kanji ? 1 : 0,
			info: row.info.join(sep),
			priority: row.priority.join(sep),
			restrict: row.restrict.join(sep),
			popular: is_popular(row.priority),
			frequency: get_frequency(row.expr)?.frequency,
			pitches: row.pitches.join(';'),
		}))
	})

	const join = (ls: string[] | undefined) => (ls ? ls.join(sep) : '')

	const tb_sense = entries.flatMap((x) => {
		return x.sense.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			stag_kanji: join(row.stag_kanji),
			stag_reading: join(row.stag_reading),
			part_of_speech: join(row.pos),
			dialect: join(row.dialect),
			xref: join(row.xref),
			antonym: join(row.antonym),
			field: join(row.field),
			misc: join(row.misc),
			info: join(row.info),
		}))
	})

	const tb_sense_source = entries.flatMap((x) => {
		return x.sense.flatMap((row, pos) =>
			!row.source
				? []
				: row.source.map((it, elem) => ({
						sequence: x.sequence,
						pos: pos,
						elem: elem,
						text: it.text,
						lang: it.lang,
						partial: it.partial,
						wasei: it.wasei,
				  })),
		)
	})

	const tb_sense_glossary = entries.flatMap((x) => {
		return x.sense.flatMap((row, pos) =>
			row.glossary.map((it, elem) => ({
				sequence: x.sequence,
				pos: pos,
				elem: elem,
				text: it.text,
				type: it.type,
			})),
		)
	})

	await db.insert('tags', tb_tags)
	await db.insert('entries', tb_entries)
	await db.insert('word_frequency', tb_word_frequency)
	await db.insert('entries_index', tb_entries_index)
	await db.insert('entries_kanji', tb_kanji)
	await db.insert('entries_reading', tb_readings)
	await db.insert('entries_sense', tb_sense)
	await db.insert('entries_sense_source', tb_sense_source)
	await db.insert('entries_sense_glossary', tb_sense_glossary)
	await db.insert('entries_map', tb_entries_map)

	console.log('\n>>> Building database indexes...')
	const start_db_index = lib.now()

	// Note that even if our index keywords are case-insensitive we still need
	// the `COLLATE NOCASE` to make sure SQLite uses the index with the LIKE
	// operator (which is case-insensitive by default).
	//
	// The other option would be for clients to use the following:
	//
	//     PRAGMA case_sensitive_like = 1
	//
	// But that would require clients to be aware of that.
	await db.exec(`CREATE INDEX idx_entries_kanji_expr ON entries_kanji (expr)`)
	await db.exec(`CREATE INDEX idx_entries_reading_expr ON entries_reading (expr)`)
	await db.exec(`CREATE INDEX idx_entries_map_expr ON entries_map (expr COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_hiragana ON entries_map (hiragana COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_hiragana_rev ON entries_map (hiragana_rev COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword ON entries_map (keyword COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword_rev ON entries_map (keyword_rev COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword_set ON entries_map (keyword_set COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_index_kanji ON entries_index (kanji)`)
	await db.exec(`CREATE INDEX idx_entries_index_reading ON entries_index (reading)`)
	await db.exec(`CREATE INDEX idx_entries_index_hiragana ON entries_index (hiragana)`)
	await db.exec(`CREATE INDEX idx_word_frequency ON word_frequency (word)`)
	console.log(`--- Indexes created in ${lib.elapsed(start_db_index)}`)

	await db.close()

	const delta = lib.now() - start_db
	const per_entry = delta / entries.length
	const per_delta = entries.length / (delta / 1000)
	console.log(
		`\nGenerated database in ${lib.duration(delta)} ` +
			`(${lib.duration(per_entry)} per row / ${per_delta.toFixed(1)} per sec)...`,
	)
}

main().catch((err) => {
	console.error(err)
})

class DB {
	private db: sqlite.Database

	constructor(filename: string) {
		this.db = new sqlite.Database(filename)
	}

	async close() {
		return new Promise<void>((resolve, reject) => {
			this.db.close((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async insert(table: string, rows: Array<Record<string, unknown>>) {
		if (!rows.length) {
			return
		}

		const cols = Object.keys(rows[0])
		console.log(`>>> INSERTING ${rows.length} rows into ${table}...`)

		const start = lib.now()

		await this.exec('BEGIN EXCLUSIVE')

		const SQL = ['INSERT INTO ', table, ' (', cols.join(', '), ') VALUES (', cols.map(() => '?').join(', '), ')']
		const stmt = await this.prepare(SQL.join(''))
		for (let i = 0; i < rows.length; i++) {
			const pos = i + 1
			const row = rows[i]
			const args = []
			for (const key of cols) {
				args.push(row[key])
			}
			await this.run(stmt, args)
			if (pos % 10000 == 0) {
				const total = pos
				const delta = lib.now() - start
				const rate = (total / (delta / 1000)).toFixed(0)
				const time = lib.duration(delta / total)
				console.log(`    ${pos} (${rate} per sec / ${time} per row)...`)
			}
		}

		await this.exec('END')
		await this.finalize(stmt)

		const total = rows.length
		const delta = lib.now() - start
		const rate = (total / (delta / 1000)).toFixed(0)
		const time = lib.duration(delta / total)
		console.log(`=== Inserted in ${lib.duration(delta)} (${rate} per sec / ${time} per row)\n`)
	}

	async run(cmd: sqlite.Statement, args: unknown[]) {
		return new Promise<void>((resolve, reject) => {
			cmd.run(args, (err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async finalize(cmd: sqlite.Statement) {
		return new Promise<void>((resolve, reject) => {
			cmd.finalize((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async prepare(sql: string) {
		return new Promise<sqlite.Statement>((resolve, reject) => {
			this.db.prepare(sql, function (err) {
				if (err) {
					reject(err)
				}
				resolve(this)
			})
		})
	}

	async exec(sql: string) {
		return new Promise<void>((resolve, reject) => {
			this.db.exec(sql, (err) => {
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	}
}
