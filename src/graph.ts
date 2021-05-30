import { buildSchema, graphql } from 'graphql'

import * as dict from './dict'

/**
 * The root GraphQL schema.
 */
export const SCHEMA = buildSchema(`
	type Query {
		"List of dictionary tags."
		tags(
			"""
			If provided will filter the tags by name.

			Names are not case-sensitive and support glob characters.
			"""
			names: [String!] = []
		): [Tag!]!

		"Retrieves a dictionary entry by its id"
		entry(id: String!): Entry

		"Retrieves a list of dictionary entries by their id"
		entries(ids: [String!]!): [Entry!]!

		"""
		Lookup entries by the kanji/reading pair.

		This searches for an exact match on both the kanji and reading. That
		means no de-inflection, kana conversion, fuzzy matching, prefix, or
		suffix match.

		The purpose of this field is to lookup for known dictionary entries
		without having to resort to their ID. As such, this lookup is very
		strict in an attempt to match an entry exactly.

		When kanji is empty, this will only match kana-only entries. If the
		kanji is the same as the reading, it is handled as an empty kanji. This
		is for convenience to allow using an Entry word/read pair for the lookup.

		Finally, if the kanji/reading pairs are ambiguous towards more than one
		entry, then the match will consider the entries that have that kanji
		and reading as the first entries.

		If the entry is still ambiguous, all matching entries are returned in
		database order. The database order has the more frequent/popular entries
		first.
		"""
		lookup(kanji: String!, reading: String!): [Entry!]!
	}

	"Tag applicable to dictionary entries."
	type Tag {
		"Tag name."
		name: String!

		"Description for the tag."
		text: String!
	}

	"""
	This is the root element for a dictionary entry.
	"""
	type Entry {
		"""
		Unique numeric sequence ID for this entry
		"""
		id: String!

		"""
		This will be the expression for the first entry in 'kanji' if available,
		or the first entry in 'reading' otherwise.
		"""
		word: String!

		"""
		The first reading for the entry.
		"""
		read: String!

		"""
		For entries with frequency information, this provides the relative rank
		of the entry across all entries in the dictionary.
		"""
		rank: Int

		"""
		When available, provides a relative frequency count for the entry across
		multiple source corpus.

		For any particular entry, this is the maximum frequency of the kanji
		elements. If an entry is kana-only, then this is the maximum frequency
		of the reading elements.
		"""
		frequency: Float

		"""
		Provides the relative position of the entry across all dictionary
		entries.

		This is similar to rank, but also takes into account popular entries.
		For entries without frequency information, this will take into account
		the relative position of the entries in the source dictionary (which
		also serves as a weaker indication of popularity).
		"""
		position: Int!

		"""
		JLPT level for the entry from 1-5.

		Note that those are not official and some entries may have been
		misplaced.

		Some words have two levels (one for reading and the other for the kanji).
		In those cases highest level is provided.
		"""
		jlpt: Int

		"""
		Indicates if this is a popular entry. This is true if any kanji or
		reading element is popular.
		"""
		popular: Boolean!

		"""
		List of non-kana readings for the entry. For the most part this will
		be the kanji form of the word, but in some cases this may include
		characters in other scripts.

		The overwhelming majority of entries will have a single kanji element
		associated with a word in Japanese. Where there are multiple kanji
		elements within an entry, they will be orthographical variants of the
		same word. Common "mis-spellings" may be included, provided they are
		associated with appropriate information fields.
		"""
		kanji: [EntryKanji!]!

		"""
		The reading element typically contains the valid readings of the word(s)
		in the kanji element using modern kanadzukai.

		Where there are multiple reading elements, they will typically be
		alternative readings of the kanji element. In the absence of a kanji
		element, i.e. in the case of a word or phrase written entirely in kana,
		these elements will define the entry.
		"""
		reading: [EntryReading!]!

		"""
		The sense element will record the translational equivalent of the
		word, plus other related information. Where there are several different
		meanings of the word, multiple sense elements will be employed.
		"""
		sense: [EntrySense!]!
	}

	"""
	Represents a kanji element for an Entry.
	"""
	type EntryKanji {
		"""
		This element will contain a word or short phrase in Japanese
		which is written using at least one non-kana character (usually kanji,
		but can be other characters, including other alphabets in exceptional
		cases).
		"""
		expr: String!

		"""
		List of tags related specifically to the orthography of 'expr', and will
		typically indicate some unusual aspect, such as okurigana irregularity.
		"""
		info: [Tag!]!

		"""
		Indicates if this is a popular entry.

		This is based on the presence of the following priority tags: news1,
		ichi1, spec1, spec2, and gai1.
		"""
		popular: Boolean!

		"""
		Labels related to information about the relative priority of the entry,
		and consist of codes indicating the word appears in various references
		which can be taken as an indication of the frequency with which the word
		is used.

		Note that readings can have their own labels as well. The reason both the
		kanji and reading elements are tagged is because on occasions a priority
		is only associated with a particular kanji/reading pair.

		Current tags are:

		- 'news1/2': appears in the "wordfreq" file compiled from the Mainichi
		Shimbun newspaper. Words in the first 12,000 in that file are marked
		"news1" and words in the second 12,000 are marked "news2".

		- 'ichi1/2': appears in the "Ichimango goi bunruishuu". Entries marked
		"ichi2" were demoted from "ichi1" because they were observed to have
		low frequencies in the WWW and newspapers.

		- 'spec1/2': a small number of words use this marker when they are
		detected as being common, but are not included in other lists.

		- 'gai1/2': common loanwords, based on the wordfreq file.

		- 'nfxx': this is an indicator of frequency-of-use ranking in the
		wordfreq file. "xx" is the number of the set of 500 words in which
		the entry can be found, with "01" assigned to the first 500, "02"
		to the second, and so on.

		The entries with news1, ichi1, spec1, spec2 and gai1 values are marked
		as "popular" in the EDICT and EDICT2 files.
		"""
		priority: [Tag!]!
	}

	"""
	Represents a reading element for an Entry.
	"""
	type EntryReading {
		"""
		Reading restricted to kana and related characters such as chouon and
		kurikaeshi. Kana usage will be consistent between the kanji and reading
		elements (e.g. if one contains katakana, so will the other).
		"""
		expr: String!

		"""
		Indicates that the reading, while associated with the kanji, cannot be
		regarded as a true reading of the kanji. It is typically used for words
		such as foreign place names, gairaigo which can be in kanji or katakana,
		etc.
		"""
		no_kanji: Boolean!

		"""
		This element is used to indicate when the reading only applies to a
		subset of the kanji elements in the entry. In its absence, all readings
		apply to all kanji elements. The contents of this element exactly match
		those of one of the kanji elements.
		"""
		restrict: [String!]!

		"""
		Tags pertaining to the specific reading. Typically it will be used to
		indicate some unusual aspect of the reading.
		"""
		info: [Tag!]!

		"""
		Indicates if this is a popular entry.

		This is based on the presence of the following priority tags: news1,
		ichi1, spec1, spec2, and gai1.
		"""
		popular: Boolean!

		"""
		Labels related to information about the relative priority of the entry.

		See the equivalent field in EntryKanji for more information.
		"""
		priority: [Tag!]!

		"""
		List of pitch information for the reading.
		"""
		pitches: [EntryPitch!]!
	}

	"""
	Pitch information for an EntryReading.
	"""
	type EntryPitch {
		"""
		Pitch information for the reading. This is based on the mora for the
		reading. The values are:
		- 0: First mora is low, all other are high.
		- 1: First mora is high, all other are low.
		- N: First mora is low, then high up to but not including N.
		"""
		value: Int!

		"""
		Tags for this particular pitch. Existing tags are:
		- 'adv' adverb
		- 'n' noun
		- 'pn' pronoun
		- 'adj-na' adjectival nouns or quasi-adjectives
		- 'int' interjection
		"""
		tags: [Tag!]!
	}

	"""
	Sense element for an Entry.
	"""
	type EntrySense {
		"""
		If present, indicate that the sense is restricted to the lexeme
		represented by the respective kanji element.
		"""
		stag_kanji: [String!]!

		"""
		If present, indicate that the sense is restricted to the lexeme
		represented by the respective reading element.
		"""
		stag_reading: [String!]!

		"""
		Tags corresponding to part-of-speech information about the entry/sense.

		In general where there are multiple senses in an entry, the part-of-speech
		of an earlier sense will apply to later senses unless there is a new
		part-of-speech indicated.
		"""
		pos: [Tag!]!

		"""
		This element is used to indicate a cross-reference to another entry with
		a similar or related meaning or sense. The content of this element is
		typically a kanji or reading element in another entry. In some cases the
		kanji will be followed by reading and/or sense number to provide a precise
		target for the cross-reference. Where this happens, a JIS "centre-dot"
		(0x2126) is placed between the components of the cross-reference.
		"""
		xref: [String!]!

		"""
		This element is used to indicate another entry which is an antonym of
		the current entry/sense. The content of this element must exactly match
		that of a kanji or reading element in another entry.
		"""
		antonym: [String!]!

		"""
		Tags with information about the field of application of the entry/sense.
		When absent, general application is implied.
		"""
		field: [Tag!]!

		"""
		Tags used for other relevant information about the entry/sense. As with
		part-of-speech, information will usually apply to several senses.
		"""
		misc: [Tag!]!

		"""
		The sense-information elements provided for additional information to be
		recorded about a sense. Typical usage would be to indicate such things
		as level of currency of a sense, the regional variations, etc.
		"""
		info: [String!]!

		"""
		For words specifically associated with regional dialects in Japanese,
		will contain tags for that dialect (e.g. ksb for Kansaiben).
		"""
		dialect: [Tag!]!

		"""
		This element records the information about the source language(s) of a
		loan-word/gairaigo. The element value is the source word or phrase.
		"""
		source: [EntrySenseSource!]!

		"""
		Within each sense will be one or more glossary entries, i.e. words or
		phrases which are equivalents to the Japanese word. This element would
		normally be present, however it may be omitted in entries which are
		purely for a cross-reference.
		"""
		glossary: [EntrySenseGlossary!]!
	}

	"""
	Source element for an EntrySense.
	"""
	type EntrySenseSource {
		"""
		Text for the entry. This is the word or phrase in the source language.
		"""
		text: String!

		"""
		The language from which a loanword is drawn. It will be coded using the
		three-letter language code from the ISO 639-2 standard.
		"""
		lang: String!

		"""
		Indicates whether the source element fully or partially describes the
		source word or phrase of the loanword.
		"""
		partial: Boolean!

		"""
		Indicates that the Japanese word has been constructed from words in the
		source language, and not from an actual phrase in that language. Most
		commonly used to indicate "waseieigo".
		"""
		wasei: Boolean!
	}

	"""
	Glossary element for an EntrySense.
	"""
	type EntrySenseGlossary {
		"""
		Text for the glossary entry.
		"""
		text: String!

		"""
		Specifies that the glossary is of a particular type.

		Possible values are 'literal' | 'figurative' | 'explanation'
		"""
		type: String
	}
`)

/**
 * The root GraphQL resolver.
 */
export const ROOT = {
	tags: dict.tags.all,
	entry: dict.entries.by_id,
	entries: dict.entries.by_ids,
	lookup: dict.entries.lookup,
}

/**
 * Executes a GraphQL query directly.
 */
export async function query(query: string, args?: { variables?: Record<string, unknown>; operation?: string }) {
	const result = await graphql({
		schema: SCHEMA,
		rootValue: ROOT,
		source: query,
		variableValues: args?.variables,
		operationName: args?.operation,
	})
	return result
}
