import { EntryMatch } from '../../lib/entries'
import { group_by } from '../../lib/list'

import DB from './db'
import * as table from './table'
import * as tags from './tags'

export { EntryMatch, EntryMatchMode } from '../../lib/entries'

type EntryRowArgs = {
	row: table.Entry
	kanji_map: Map<string, EntryKanji[]>
	reading_map: Map<string, EntryReading[]>
	sense_map: Map<string, EntrySense[]>
	source_map: Map<string, EntrySenseSource[]>
	glossary_map: Map<string, EntrySenseGlossary[]>
}

export class Entry {
	readonly id: string
	readonly rank: number | null
	readonly position: number | null
	readonly frequency: number | null
	readonly jlpt: number | null
	readonly popular: boolean
	readonly kanji: EntryKanji[]
	readonly reading: EntryReading[]
	readonly sense: EntrySense[]

	readonly match?: EntryMatch

	private constructor(args: EntryRowArgs | Entry, match?: EntryMatch) {
		if (args instanceof Entry) {
			this.id = args.id
			this.rank = args.rank
			this.position = args.position
			this.frequency = args.frequency
			this.jlpt = args.jlpt
			this.popular = args.popular
			this.kanji = args.kanji
			this.reading = args.reading
			this.sense = args.sense
			if (match) {
				this.match = match
			}
		} else {
			const row = args.row
			const sources = args.source_map.get(row.sequence) || []
			const glossaries = args.glossary_map.get(row.sequence) || []
			this.id = row.sequence
			this.rank = row.rank
			this.position = row.position
			this.frequency = row.frequency
			this.jlpt = row.jlpt
			this.popular = !!row.popular
			this.kanji = args.kanji_map.get(row.sequence) || []
			this.reading = args.reading_map.get(row.sequence) || []
			this.sense = (args.sense_map.get(row.sequence) || []).map((row) => ({
				...row,
				source: sources.filter((x) => x.$pos == row.$pos),
				glossary: glossaries.filter((x) => x.$pos == row.$pos),
			}))
		}
	}

	/**
	 * Returns a shallow clone of the entry with the given match information.
	 */
	with_match_info(match: EntryMatch) {
		const out = new Entry(this, match)
		return out
	}

	/**
	 * Returns if the Entry contains one of the tags given in the set.
	 *
	 * This only checks for grammatically relevant tags, such as the ones used
	 * by the de-inflection algorithm.
	 */
	has_rule_tag(tags: Set<string>) {
		const has = (src: tags.Tag[]) => {
			if (src.some((x) => tags.has(x.name))) {
				return true
			}

			// We also need to test the tags prefix, because the actual entries
			// have tags like `v5u` while the rules are simply `v5`.
			for (const it of tags) {
				if (src.some((x) => x.name.startsWith(it))) {
					return true
				}
			}
			return false
		}
		return (
			this.kanji.some((x) => has(x.info)) ||
			this.reading.some((x) => has(x.info)) ||
			this.sense.some((x) => has(x.pos))
		)
	}

	word() {
		return this.kanji.length ? this.kanji[0].expr : this.reading[0].expr
	}

	read() {
		return this.reading[0].expr
	}

	text() {
		return this.sense.map((x) => x.glossary.map((x) => x.text).join(', ')).join(' | ')
	}

	/**
	 * Check if any kanji/reading term of the entry matches one of the given
	 * regexes.
	 */
	matches_any(regex: RegExp[]) {
		for (const it of this.kanji) {
			if (regex.some((x) => x.test(it.expr))) {
				return true
			}
		}

		for (const it of this.reading) {
			if (regex.some((x) => x.test(it.expr))) {
				return true
			}
		}

		return false
	}

	static async count() {
		const dict = await DB.get_dict()
		const rows = await dict.query<{ count: number }>(`SELECT COUNT(*) AS count FROM entries`)
		return rows[0].count
	}

	static async get(ids: string[]) {
		if (!ids.length) {
			return []
		}

		const sequences = ids
			.filter((x) => /^\d+$/.test(x))
			.map((x) => `'${x}'`)
			.join(', ')
		const condition = `sequence IN (${sequences})`

		const dict = await DB.get_dict()
		const rows = dict.query<table.Entry>(`SELECT * FROM entries WHERE ${condition}`)
		const kanji = dict.query<table.EntryKanji>(`SELECT * FROM entries_kanji WHERE ${condition}`)
		const reading = dict.query<table.EntryReading>(`SELECT * FROM entries_reading WHERE ${condition}`)
		const sense = dict.query<table.EntrySense>(`SELECT * FROM entries_sense WHERE ${condition}`)
		const glossary = dict.query<table.EntrySenseGlossary>(`SELECT * FROM entries_sense_glossary WHERE ${condition}`)
		const source = dict.query<table.EntrySenseSource>(`SELECT * FROM entries_sense_source WHERE ${condition}`)
		const all_tags = await tags.all()

		const kanji_map = group_by(
			(await kanji).map((row) => {
				const out = {
					expr: row.expr,
					info: tags.split(row.info, all_tags),
					priority: tags.split(row.priority, all_tags),
					popular: !!row.popular,
				}
				return { key: row.sequence, val: out }
			}),
			(row) => [row.key, row.val],
		)

		const reading_map = group_by(
			(await reading).map((row) => {
				const out = {
					expr: row.expr,
					no_kanji: !!row.no_kanji,
					restrict: split(row.restrict),
					info: tags.split(row.info, all_tags),
					popular: !!row.popular,
					priority: tags.split(row.priority, all_tags),
					pitches: parse_pitch(row.pitches, all_tags),
				}
				return { key: row.sequence, val: out }
			}),
			(row) => [row.key, row.val],
		)

		const sense_map = group_by(
			(await sense).map((row) => {
				const out = {
					stag_kanji: split(row.stag_kanji),
					stag_reading: split(row.stag_reading),
					pos: tags.split(row.part_of_speech, all_tags),
					xref: split(row.xref),
					antonym: split(row.antonym),
					field: tags.split(row.field, all_tags),
					misc: tags.split(row.misc, all_tags),
					info: split(row.info),
					dialect: tags.split(row.dialect, all_tags),
					source: [],
					glossary: [],
					$pos: row.pos,
				}
				return { key: row.sequence, val: out }
			}),
			(row) => [row.key, row.val],
		)

		const source_map = group_by(
			(await source).map((row) => {
				const out = {
					$pos: row.pos,
					text: row.text,
					lang: row.lang,
					partial: !!row.partial,
					wasei: !!row.wasei,
				}
				return { key: row.sequence, val: out }
			}),
			(row) => [row.key, row.val],
		)

		const glossary_map = group_by(
			(await glossary).map((row) => {
				const out = {
					$pos: row.pos,
					text: row.text,
					type: row.type,
				}
				return { key: row.sequence, val: out }
			}),
			(row) => [row.key, row.val],
		)

		const entries = (await rows).map((row) => {
			const out = new Entry({ row, kanji_map, reading_map, sense_map, source_map, glossary_map })
			return out
		})

		const entries_map = new Map(entries.map((x) => [x.id, x]))
		const out = ids.map((x) => entries_map.get(x)!).filter((x) => !!x)
		return out
	}

	/**
	 * Load words using an exact match. If the `glob` option is given in `args`
	 * then this will support `*` and `?`.
	 */
	static async exact(words: string[], args?: { glob?: boolean }) {
		if (!words.length) {
			return []
		}

		const params: Record<string, string> = {}
		const where = (args?.glob ? words.map((w) => w.replace(/[?？]/g, '?').replace(/[*＊]/g, '%')) : words)
			.map((w, n) => {
				const name = `p${n + 1}`
				params[name] = w
				return `(m.expr LIKE @${name} OR m.hiragana LIKE @${name})`
			})
			.join(' OR ')

		const sql = [
			`SELECT DISTINCT m.sequence`,
			`FROM entries_map m`,
			`LEFT JOIN entries e ON e.sequence = m.sequence`,
			`WHERE ${where}`,
			`ORDER BY e.position`,
		].join('\n')

		const db = await DB.get_dict()
		const rows = await db.query<{ sequence: string }>(sql, params)

		return await Entry.get(rows.map((x) => x.sequence))
	}
}

export type EntryKanji = { expr: string; info: tags.Tag[]; priority: tags.Tag[]; popular: boolean }
export type EntryReading = {
	expr: string
	no_kanji: boolean
	restrict: string[]
	info: tags.Tag[]
	popular: boolean
	priority: tags.Tag[]
	pitches: { value: number; tags: tags.Tag[] }[]
}
export type EntrySense = {
	stag_kanji: string[]
	stag_reading: string[]
	pos: tags.Tag[]
	xref: string[]
	antonym: string[]
	field: tags.Tag[]
	misc: tags.Tag[]
	info: string[]
	dialect: tags.Tag[]
	$pos: number
	source: EntrySenseSource[]
	glossary: EntrySenseGlossary[]
}
export type EntrySenseSource = { $pos: number; text: string; lang: string; partial: boolean; wasei: boolean }
export type EntrySenseGlossary = { $pos: number; text: string; type: string }

function split(ls: string): string[] {
	return ls ? ls.split('||') : []
}

function parse_pitch(input: string, all_tags: tags.Tag[]) {
	if (!input) {
		return []
	}
	return input.split(';').map((x) => {
		const [num, val] = x.split(':')
		return { value: parseInt(num, 10), tags: tags.split(val, all_tags) }
	})
}
