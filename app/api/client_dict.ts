import * as graphql from './graphql'

//----------------------------------------------------------------------------//
// Tags
//----------------------------------------------------------------------------//

export type Tag = {
	name: string
	text: string
}

let _tags: Promise<Tag[]> | null = null

export async function tags() {
	_tags = _tags || graphql.query<{ tags: Tag[] }>('{ tags { name text } }').then((x) => x.tags)
	return _tags
}

export async function tag(name: string) {
	const all = await tags()
	return all.filter((it) => it.name == name)[0] || { name, text: name }
}

export async function to_tags(names: Array<{ name: string }>) {
	const all = await tags()
	return names.map((it) => all.filter((x) => it.name == x.name)[0] || { name: it.name, text: it.name })
}

//----------------------------------------------------------------------------//
// Words
//----------------------------------------------------------------------------//

export type Entry = {
	id: string
	match_mode: string
	word: string
	read: string
	text: string
	rank: number
	frequency: number
	position: number
	jlpt: number
	popular: boolean
	kanji: EntryKanji[]
	reading: EntryReading[]
	sense: EntrySense[]
}

export type EntryKanji = {
	expr: string
	info: Tag[]
	popular: boolean
	priority: Tag[]
}

export type EntryReading = {
	expr: string
	no_kanji: boolean
	restrict: string[]
	info: Tag[]
	popular: boolean
	priority: Tag[]
	pitches: EntryPitch[]
}

export type EntrySense = {
	stag_kanji: string[]
	stag_reading: string[]
	pos: Tag[]
	xref: string[]
	antonym: string[]
	field: Tag[]
	misc: Tag[]
	info: Tag[]
	dialect: Tag[]
	source: EntrySenseSource[]
	glossary: EntrySenseGlossary[]
}

export type EntryPitch = {
	value: number
	tags: Tag[]
}

export type EntrySenseSource = {
	text: string
	lang: string
	partial: boolean
	wasei: boolean
}

export type EntrySenseGlossary = {
	text: string
	type: 'literal' | 'figurative' | 'explanation'
}

let _word_count: Promise<number> | null = null

export async function word_count() {
	_word_count = _word_count || graphql.query<{ count: number }>('{ count: word_count }').then((x) => x.count)
	return _word_count
}

export async function words(args: { limit?: number; offset?: number }) {
	const data = graphql.query<{ words: Entry[] }>(`
		query {
			words(offset: ${args.offset || 0}, limit: ${args.limit || 100}) {
				...EntryF
			}
		}
		${graphql.ENTRY_FRAGMENTS}
	`)
	return data.then((x) => x.words)
}
