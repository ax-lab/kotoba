import { group_by } from '../../lib/list'

import DB from './db'
import * as table from './table'
import * as tags from './tags'

function split(ls: string): string[] {
	return ls ? ls.split('||') : []
}

async function entries_by_ids(ids: string[]) {
	const sequences = ids
		.filter((x) => /^\d+$/.test(x))
		.map((x) => `"${x}"`)
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
		const sources = source_map.get(row.sequence) || []
		const glossaries = glossary_map.get(row.sequence) || []
		const out = {
			id: row.sequence,
			word: '',
			read: '',
			rank: row.rank,
			frequency: row.frequency,
			jlpt: row.jlpt,
			popular: !!row.popular,
			kanji: kanji_map.get(row.sequence) || [],
			reading: reading_map.get(row.sequence) || [],
			sense: (sense_map.get(row.sequence) || []).map((row) => ({
				...row,
				source: sources.filter((x) => x.$pos == row.$pos),
				glossary: glossaries.filter((x) => x.$pos == row.$pos),
			})),
		}
		out.word = out.kanji.length ? out.kanji[0].expr : out.reading[0].expr
		out.read = out.reading[0].expr
		return out
	})

	const entries_map = new Map(entries.map((x) => [x.id, x]))
	return ids.map((x) => entries_map.get(x)!).filter((x) => !!x)
}

export async function by_id(args: { id: string }) {
	return (await entries_by_ids([args.id])).shift()
}

export async function by_ids(args: { ids: string[] }) {
	return await entries_by_ids(args.ids)
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
