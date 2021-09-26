import { EntryMatch } from '../../lib/entries'

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
// Word listing
//----------------------------------------------------------------------------//

export type Entry = {
	id: string
	match?: EntryMatch
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
	const data = graphql.query<{ list: Entry[]; count: number }>(`
		query {
			count: word_count
			list:  words(offset: ${args.offset || 0}, limit: ${args.limit || 100}) {
				...EntryF
			}
		}
		${graphql.ENTRY_FRAGMENTS}
	`)
	return data
}

//----------------------------------------------------------------------------//
// Search
//----------------------------------------------------------------------------//

/**
 * Search dictionary entries using the GraphQL endpoint.
 */
export async function search(text: string, args?: { id?: string; offset?: number; limit?: number }) {
	if (!text.trim()) {
		const empty: Search = {
			id: args?.id || '',
			total: 0,
			elapsed: 0,
			loading: false,
			page: {
				offset: 0,
				limit: 0,
				entries: [],
			},
		}
		return empty
	}

	const offset = args?.offset || 0
	const limit = args?.limit == null ? 25 : Math.max(args.limit, 0)

	const vars = { id: args?.id, text, offset, limit }
	const out = await graphql.query<{ search: Search }>(
		`
		query($id: String, $text: String!, $offset: Int!, $limit: Int!) {
			search(id: $id, query: $text) {
				id total elapsed loading
				page(offset: $offset, limit: $limit) {
					offset limit
					entries {
						...EntryF
					}
				}
			}
		}
		${graphql.ENTRY_FRAGMENTS}
		`,
		vars,
	)
	return out.search
}

export type Search = {
	id: string
	total: number
	elapsed: number
	loading: boolean
	page: SearchPage
}

export type SearchPage = {
	offset: number
	limit: number
	entries: Entry[]
}

//----------------------------------------------------------------------------//
// History
//----------------------------------------------------------------------------//

export type HistoryEntry = {
	id: string
	text: string
	date: Date
}

/**
 * Return the list of saved phrases from the history.
 */
export async function list_history() {
	const out = await graphql.query<{ phrases: { id: string; text: string; date: string }[] }>(
		`query {
			phrases {
				id text date
			}
		}`,
	)
	return out.phrases
		.map<HistoryEntry>((x) => ({ ...x, date: new Date(x.date) }))
		.sort((a, b) => b.date.getTime() - a.date.getTime())
}

/**
 * Save a phrase to the history.
 */
export async function save_history(text: string) {
	const out = await graphql.query<{ id: string }>(
		`mutation($text: String!) {
			id: add_phrase(text: $text)
		}`,
		{ text },
	)
	return out.id
}

/**
 * Delete a phrase from the history.
 */
export async function remove_history(id: string) {
	await graphql.query(
		`mutation($id: String!) {
			remove_phrase(id: $id)
		}`,
		{ id },
	)
}
