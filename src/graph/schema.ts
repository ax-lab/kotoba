// Contants with the GraphQL schema

export const SCHEMA_TEXT = `
	${Query()}

	${SearchResult()}

	${SearchPage()}

	${KeywordList()}

	${Tag()}

	${Entry()}

	${EntryKanji()}

	${EntryReading()}

	${EntryPitch()}

	${EntrySense()}

	${EntrySenseSource()}

	${EntrySenseGlossary()}

	${DeinflectEntry()}
`

function Query() {
	return `
		type Query {
			"List of dictionary tags."
			tags(
				"""
				If provided will filter the tags by name.

				Names are not case-sensitive and support glob characters.
				"""
				names: [String!] = []
			): [Tag!]!

			"""
			Total number of words in the dictionary.
			"""
			word_count: Int!

			"""
			Returns words by position in the default sort order (by popularity).
			"""
			words(
				offset: Int! = 0
				limit: Int! = 100
			): [Entry!]!

			"Retrieves a dictionary entry by its id"
			entry(id: String!): Entry

			"Retrieves a list of dictionary entries by their id"
			entries(ids: [String!]!): [Entry!]!

			deinflect(input: String!): [Entry!]!

			deinflect_all(input: String!): [DeinflectEntry!]!

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

			"""
			Entry search using a query string with support for multiple predicates
			and advanced search operators.

			Keywords on the search query are matched against both kanji and reading
			elements of dictionary entries. Keywords accept kanji and kana (romaji,
			hiragana, and katakana are all accepted and match each other).

			For details on the query string syntax, see below.

			# Keyword Matching and Order

			When matching a keyword to an entry's text, besides matching the entire
			text, a keyword may also match a prefix, suffix, or be contained within
			the text.

			The text matching can also be exact, approximate or fuzzy. Regardless
			of the mode, the keyword and matched text are first converted to
			hiragana (e.g. from katakana or romaji) and then compared as follows:

			- Exact compares the hiragana converted text exactly.

			- Approximate will filter the text to eliminate some common ambiguities
			and typos and then compare. The purpose is to find similar words when
			no exact match is found. In particular:

				- Small tsu are ignored. A normal tsu in the middle of the word is
				also ignored if it could have been mistaken from a small tsu.
				- Long vowels match as a single vowel. This includes the long
				katakana mark, diphthongs, and repeated vowels.
				- Voicing kana marks are also ignored, i.e. は、ば、ぱ will match
				each other.
				- Small characters are converted to their large variants.
				- Fullwidth characters are converted to ASCII.
				- Only letters and digits are considered when matching.

			- Fuzzy is like approximate but will match the characters in any point
			in the text as long as they are in the correct order.

			By default, any keyword will match exactly and approximately. Fuzzy
			matching will only be used for keywords where it is explicitly enabled.
			It is also possible to only match keywords exactly, i.e. disabling the
			approximate matching.

			Results are returned in order of relevance:

			- First results are sorted into exact, approximate, and fuzzy matching
			groups.
			- In each group, results are sorted into full, prefix, suffix, and
			contains matches, in that order.
			- For each of the above result groups, results are sorted first by
			length, then by word popularity, and then frequency.

			# Query Syntax

			Note that all operators bellow also accept the fullwidth Japanese
			characters.

			The query can contain multiple predicates separated by spaces. Entries
			can match either predicate, i.e. they combine with an OR operator.

			Besides a plain keyword, the following operators can be used in a
			keyword to modify it:

			- The '=' prefix in a keyword marks it as an exact match.
			- The '>' prefix in a keyword enables fuzzy matching for that keyword.
			- Keywords can also contain the '*' and '?' glob operators to match
			respectively a sequence of zero or more characters, and a single
			character. Those operators are matched independently of the prefix,
			suffix, and contains matches.

			Note that the keyword operators cannot be split from the keywords by
			spaces.

			Keywords can be combined with '&' (AND) and '~' (AND NOT) operators.
			Entries will be matched using the combined keywords with any of their
			kanji and reading elements.

			A full predicate can be negated using the '!' prefix operator. When
			combined with the OR, negated predicates take precedence, meaning that
			any negated that matches will negate the entire OR match.

			Finally, predicates can be combined using parenthesis and square
			brackets.
			"""
			search(

				"""
				User-defined ID for this search. This is returned as-is and has no
				defined meaning.
				"""
				id: String

				"""
				Search query expression.

				This support multiple predicates separated by spaces. Entries can
				match any of the predicates. See the 'search' field documentation
				for details on the syntax.
				"""
				query: String!

			): SearchResult!

			"""
			List entries by keyword.

			The keyword is searched in both the kanji and reading elements of the
			entries. Both keyword and entry elements are also converted to hiragana
			before matching.
			"""
			list(keyword: String!): KeywordList!
		}
	`
}

function SearchResult() {
	return `
		"""
		Main element for a search result.
		"""
		type SearchResult {
			"""
			The user-supplied id exactly. If no ID was passed, this defaults to
			query.
			"""
			id: String!

			"""
			Total number of entries matched across all pages. If 'loading' is true
			this is a partial count of the number of rows loaded so far.
			"""
			total: Int!

			"""
			Elapsed time in seconds for the entire search. If 'loading' is true,
			this is the partial time elapsed so far.
			"""
			elapsed: Float!

			"""
			This is true if the search is still loading on the backend.

			A loading search may not return all possible entries for a given page
			range. The 'total' and 'elapsed' fields are also partial running values.
			"""
			loading: Boolean!

			"""
			Loads a page from the results.

			The page must specify a offset in the results (starting from zero) and
			a limit number of entries.

			Note that unless a search is completed ('loading' is false), it is not
			guaranteed that a page will return all possible entries. The specified
			limit is only a maximum bound on the number of items. The reason for
			this is that pages return as soon as rows are available on their range,
			even if the entire range hasn't been fullfiled and the search is still
			loading.
			"""
			page(
				"""
				Offset of the first entry in the page. Zero will return the first
				entry.
				"""
				offset: Int! = 0,

				"""
				Maximum number of entries in the page. Must be a non-zero positive
				number. See notes on loading and limits for the 'page' field.
				"""
				limit: Int! = 100,
			): SearchPage!
		}
	`
}

function SearchPage() {
	return `
		"""
		Page inside a SearchResult.
		"""
		type SearchPage {
			"""
			The user-specified offset for this page.
			"""
			offset: Int!

			"""
			The user-specified limit for this page.
			"""
			limit: Int!

			"""
			Entries for this page. The first entry, if available, will always have
			the specified offset.

			The number of entries is limited to the specified limit, but not
			guaranteed to be the full available range. See details on the 'page'
			field for 'SearchResult'.
			"""
			entries: [Entry!]!
		}
	`
}

function KeywordList() {
	return `
		"""
		Main element for looking up entries by keyword.
		"""
		type KeywordList {
			"""
			List of entries that have an exact match to the keyword.
			"""
			exact: [Entry!]!

			"""
			List of entries that match the keyword. This differs from 'exact' in
			that it allows approximate and fuzzy matching.
			"""
			matches(
				"""
				Offset the returned results by the given number of entries. Zero
				will return the first entry.
				"""
				offset: Int! = 0,

				"""
				Limits the number of entries returned. This must be a positive
				non-zero value.
				"""
				limit: Int! = 100,

				"""
				If true, instead of matching literally the text will be matched
				using an approximate comparison. This approximate comparison is
				meant to match similar words by ignoring things like long vowels,
				the small-tsu, kana voiced marks (e.g. は、ば、ぱ will match), and
				any extraneous characters (e.g. symbols, and leftover ASCII from
				a partial IME conversion).
				"""
				approx: Boolean,

				"""
				This performs the same comparison as with 'approx' enabled, but will
				also match a non-continuous sequence of characters. That means that
				as long as every character of the approximate keyword is contained
				in order in the matched sequence, the entry will match.
				"""
				fuzzy: Boolean
			): [Entry!]

			"""
			List of entries that have a prefix that matches the keyword.

			Note that this excludes exact matches.
			"""
			prefix(
				"""
				Offset the returned results by the given number of entries. Zero
				will return the first entry.
				"""
				offset: Int! = 0,

				"""
				Limits the number of entries returned. This must be a positive
				non-zero value.
				"""
				limit: Int! = 100,

				"""
				If true, instead of matching literally the text will be matched
				using an approximate comparison. This approximate comparison is
				meant to match similar words by ignoring things like long vowels,
				the small-tsu, kana voiced marks (e.g. は、ば、ぱ will match), and
				any extraneous characters (e.g. symbols, and leftover ASCII from
				a partial IME conversion).
				"""
				approx: Boolean,

				"""
				This performs the same comparison as with 'approx' enabled, but will
				also match a non-continuous sequence of characters. That means that
				as long as every character of the approximate keyword is contained
				in order in the matched sequence, the entry will match.
				"""
				fuzzy: Boolean
			): [Entry!]!

			"""
			List of entries that have a suffix that matches the keyword.

			Note that this excludes exact matches.
			"""
			suffix(
				"""
				Offset the returned results by the given number of entries. Zero
				will return the first entry.
				"""
				offset: Int! = 0,

				"""
				Limits the number of entries returned. This must be a positive
				non-zero value.
				"""
				limit: Int! = 100,

				"""
				If true, instead of matching literally the text will be matched
				using an approximate comparison. This approximate comparison is
				meant to match similar words by ignoring things like long vowels,
				the small-tsu, kana voiced marks (e.g. は、ば、ぱ will match), and
				any extraneous characters (e.g. symbols, and leftover ASCII from
				a partial IME conversion).
				"""
				approx: Boolean,

				"""
				This performs the same comparison as with 'approx' enabled, but will
				also match a non-continuous sequence of characters. That means that
				as long as every character of the approximate keyword is contained
				in order in the matched sequence, the entry will match.
				"""
				fuzzy: Boolean
			): [Entry!]!

			"""
			List of entries that contain text that match the keyword.

			Note that this excludes exact, suffix, and prefix matches.
			"""
			contains(
				"""
				Offset the returned results by the given number of entries. Zero
				will return the first entry.
				"""
				offset: Int! = 0,

				"""
				Limits the number of entries returned. This must be a positive
				non-zero value.
				"""
				limit: Int! = 100,

				"""
				If true, instead of matching literally the text will be matched
				using an approximate comparison. This approximate comparison is
				meant to match similar words by ignoring things like long vowels,
				the small-tsu, kana voiced marks (e.g. は、ば、ぱ will match), and
				any extraneous characters (e.g. symbols, and leftover ASCII from
				a partial IME conversion).
				"""
				approx: Boolean,

				"""
				This performs the same comparison as with 'approx' enabled, but will
				also match a non-continuous sequence of characters. That means that
				as long as every character of the approximate keyword is contained
				in order in the matched sequence, the entry will match.
				"""
				fuzzy: Boolean
			): [Entry!]!
		}
	`
}

function Tag() {
	return `
		"Tag applicable to dictionary entries."
		type Tag {
			"Tag name."
			name: String!

			"Description for the tag."
			text: String!
		}
	`
}

function Entry() {
	return `
		"""
		This is the root element for a dictionary entry.
		"""
		type Entry {
			"""
			Unique numeric sequence ID for this entry
			"""
			id: String!

			"""
			When the entry is loaded through a search, this is the match mode for
			the expression.

			Valid values are:
			- exact, prefix, suffix, contains
			- approx, approx-prefix, approx-suffix, approx-contains
			- fuzzy, fuzzy-prefix, fuzzy-suffix, fuzzy-contains
			"""
			match_mode: String

			"""
			De-inflection rules used to match this entry.
			"""
			deinflect: [String!]

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
			Glossary from all senses joined together.
			"""
			text: String!

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
	`
}

function EntryKanji() {
	return `
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
	`
}

function EntryReading() {
	return `
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
	`
}

function EntryPitch() {
	return `
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
	`
}

function EntrySense() {
	return `
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
	`
}

function EntrySenseSource() {
	return `
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
	`
}

function EntrySenseGlossary() {
	return `
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
	`
}

function DeinflectEntry() {
	return `
		"""
		Entry in the list returned by 'deinflect_all'.
		"""
		type DeinflectEntry {
			"""
			Raw part of the input text that was matched to this entry.
			"""
			input: String!

			"""
			The processed input that was used to actually match to the entry.
			"""
			keyword: String!

			"""
			Position in the input text that was matched to this entry.
			"""
			position: Int!

			"""
			De-inflected entries.
			"""
			entries: [Entry!]!
		}
	`
}
