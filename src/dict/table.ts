export type Entry = {
	sequence: string
	frequency: number
	popular: number
	rank: number
	jlpt: number
}

export type EntriesIndex = {
	kanji: string
	reading: string
	hiragana: string
	sequence: string
}

export type EntryKanji = {
	sequence: string
	pos: number
	expr: string
	info: string
	priority: string
	popular: number
	frequency: number
}

export type EntryReading = {
	sequence: string
	pos: number
	expr: string
	no_kanji: number
	info: string
	priority: string
	restrict: string
	popular: number
	frequency: number
	pitches: string
}

export type EntrySense = {
	sequence: string
	pos: number
	stag_kanji: string
	stag_reading: string
	part_of_speech: string
	dialect: string
	xref: string
	antonym: string
	field: string
	misc: string
	info: string
}

export type EntrySenseSource = {
	sequence: string
	pos: number
	elem: number
	text: string
	lang: string
	partial: number
	wasei: number
}

export type EntrySenseGlossary = {
	sequence: string
	pos: number
	elem: number
	text: string
	type: string
}

export type EntriesMap = {
	sequence: string
	expr: string
	keyword: string
	keyword_rev: string
	keyword_set: string
}

export type WordFrequency = {
	word: string
	frequency: number
	count_ic: number
	frequency_ic: number
	frequency_blog: number
	frequency_news: number
	frequency_twitter: number
}
