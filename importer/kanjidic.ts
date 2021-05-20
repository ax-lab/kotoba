import sax from 'sax'

import * as lib from '../lib'
import * as kana from '../lib/kana'

import { open_zip } from './files'

export type KanjiEntry = {
	/** The character itself */
	literal: string

	/** Radical elements for this Kanji. */
	radicals: KanjiEntryRadical[]

	/**
	 * The kanji grade level.
	 *
	 * - 1 through 6 indicates a Kyouiku kanji and the grade in which the kanji
	 *   is taught in Japanese schools.
	 * - 8 indicates it is one of the remaining Jouyou Kanji to be learned in
	 *   junior high school.
	 * - 9 indicates it is a Jinmeiyou (for use in names) kanji which in
	 *   addition to the Jouyou kanji are approved for use in family name
	 *   registers and other official documents.
	 * - 10 also indicates a Jinmeiyou kanji which is a variant of a Jouyou
	 *   kanji.
	 */
	grade: number | null

	/**
	 * The stroke count of the kanji, including the radical. If more than one,
	 * the first is considered the accepted count, while subsequent ones are
	 * common miscounts.
	 */
	stroke_count: number[]

	/**
	 * Either a cross-reference code to another entry, usually regarded as a
	 * variant, or an alternative indexing code for the current entry.
	 *
	 * The type of variant is given in the `type` field.
	 */
	variant: KanjiEntryVariant[]

	/**
	 * A frequency-of-use ranking. The 2,500 most-used characters have a ranking.
	 *
	 * The frequency is a number from 1 to 2,500 that expresses the relative
	 * frequency of occurrence of a character in modern Japanese. The
	 * discrimination between the less frequently used kanji is not strong.
	 *
	 * Note: actually there are 2,501 kanji ranked as there was a tie.
	 */
	frequency: number | null

	/**
	 * When the kanji is itself a radical and has a name, this element contains
	 * the name in hiragana.
	 */
	radical_names: string[]

	/**
	 * The (former) Japanese Language Proficiency test level for this kanji.
	 *
	 * Values range from 1 (most advanced) to 4 (most elementary). This field
	 * does not appear for kanji that were not required for any JLPT level.
	 *
	 * Note that the JLPT test levels changed in 2010, with a new 5-level
	 * system (N1 to N5) being introduced. No official kanji lists are available
	 * for the new levels. The new levels are regarded as being similar to the
	 * old levels except that the old level 2 is now divided between N2 and N3.
	 */
	old_jlpt: number | null

	/**
	 * These codes contain information relating to the glyph, and can be used
	 * for finding a required kanji.
	 */
	query_codes: KanjiEntryQueryCode[]

	/**
	 * The readings for the kanji in several languages, and the meanings, also
	 * in several languages. The readings and meanings are grouped to enable
	 * the handling of the situation where the meaning is differentiated by
	 * reading.
	 */
	readings_meanings: KanjiEntryReadingGroup[]

	/**
	 * Japanese readings that are now only associated with names.
	 */
	nanori: string[]

	/**
	 * Contains the index numbers and similar unstructured information such as
	 * page numbers in a number of published dictionaries, and instructional
	 * books on kanji.
	 */
	dict: KanjiEntryDict[]
}

/**
 * Type for a `KanjiEntryRadical`.
 *
 * - `classical` - based on the system first used in the KangXi Zidian.
 *   The Shibano "JIS Kanwa Jiten" is used as the reference source.
 *
 * - `nelson_c` - as used in the Nelson "Modern Japanese-English Character
 *   Dictionary" (i.e. the Classic, not the New Nelson). This will only be
 *   used where Nelson reclassified the kanji.
 */
type KanjiEntryRadicalType = 'classical' | 'nelson_c'

const kanjiEntryRadicalType: { [key in KanjiEntryRadicalType]: string } = {
	classical: '',
	nelson_c: '',
}

function isKanjiEntryRadicalType(input: string): input is KanjiEntryRadicalType {
	return input in kanjiEntryRadicalType
}

/** Radical element for a `KanjiEntry`. */
export type KanjiEntryRadical = {
	/**
	 * The radical number, in the range 1 to 214. The particular classification
	 * type is stated in the `type` field.
	 */
	value: number

	/**
	 * The rad_type attribute states the type of radical classification.
	 */
	type: KanjiEntryRadicalType
}

/**
 * Type for a `KanjiEntryVariant`.
 *
 * - `jis208` - in JIS X 0208 - kuten coding
 * - `jis212` - in JIS X 0212 - kuten coding
 * - `jis213` - in JIS X 0213 - kuten coding
 * - `deroo` - De Roo number - numeric
 * - `njecd` - Halpern NJECD index number - numeric
 * - `s_h` - The Kanji Dictionary (Spahn & Hadamitzky) - descriptor
 * - `nelson_c` - "Classic" Nelson - numeric
 * - `oneill` - Japanese Names (O'Neill) - numeric
 * - `ucs` - Unicode codepoint - hex
 */
type KanjiEntryVariantType = 'jis208' | 'jis212' | 'jis213' | 'deroo' | 'njecd' | 's_h' | 'nelson_c' | 'oneill' | 'ucs'

const kanjiEntryVariantType: { [key in KanjiEntryVariantType]: string } = {
	jis208: '',
	jis212: '',
	jis213: '',
	deroo: '',
	njecd: '',
	s_h: '',
	nelson_c: '',
	oneill: '',
	ucs: '',
}

function isKanjiEntryVariantType(input: string): input is KanjiEntryVariantType {
	return input in kanjiEntryVariantType
}

/**
 * Variant element for a `KanjiEntry`.
 */
export type KanjiEntryVariant = {
	/**
	 * Value for the variant. This is a free-form field, the contents depend on
	 * the `type` field.
	 */
	value: string

	/**
	 * Type for the variant.
	 */
	type: KanjiEntryVariantType
}

/**
 * Query codes for a `KanjiEntry`.
 */
export type KanjiEntryQueryCode = QueryCodeSkip | QueryCodeSH | QueryCodeFourCorner | QueryCodeDeroo

type QueryCodeSkipMisclass = 'posn' | 'stroke_count' | 'stroke_and_posn' | 'stroke_diff'

const queryCodeSkipMisclass: { [key in QueryCodeSkipMisclass]: string } = {
	posn: '',
	stroke_count: '',
	stroke_and_posn: '',
	stroke_diff: '',
}

function isQueryCodeSkipMisclass(input: string): input is QueryCodeSkipMisclass {
	return input in queryCodeSkipMisclass
}

type QueryCodeSkip = {
	type: 'skip'

	/**
	 * Halpern's SKIP (System of Kanji Indexing by Patterns) code. The format
	 * is `n-nn-nn`.
	 *
	 * There are also a number of misclassification codes, indicated by the
	 * field `skip_misclass`.
	 */
	value: string

	/**
	 * If available, the values of this attribute indicate the type of `skip`
	 * misclassification.
	 *
	 * - `posn` - a mistake in the division of the kanji
	 * - `stroke_count` - a mistake in the number of strokes
	 * - `stroke_and_posn` - mistakes in both division and strokes
	 * - `stroke_diff` - ambiguous stroke counts depending on glyph
	 */
	skip_misclass?: QueryCodeSkipMisclass
}

type QueryCodeSH = {
	type: 'sh_desc'

	/**
	 * The descriptor codes for The Kanji Dictionary (Tuttle 1996) by Spahn
	 * and Hadamitzky. They are in the form `nxnn.n`, e.g. 3k11.2, where the
	 * kanji has 3 strokes in the identifying radical, it is radical "k" in
	 * the SH classification system, there are 11 other strokes, and it is
	 * the 2nd kanji in the 3k11 sequence.
	 */
	value: string
}

type QueryCodeFourCorner = {
	type: 'four_corner'

	/**
	 * the "Four Corner" code for the kanji.
	 */
	value: string
}

type QueryCodeDeroo = {
	type: 'deroo'

	/**
	 * The codes developed by the late Father Joseph De Roo, and published
	 * in his book "2001 Kanji" (Bonjinsha).
	 */
	value: string
}

/**
 * Reading/meaning element for a `KanjiEntry`.
 */
export type KanjiEntryReadingGroup = {
	/**
	 * Contains a list of the readings or pronunciations of the kanji.
	 */
	readings: KanjiEntryReading[]

	/**
	 * Contains a list of the meanings associated with the kanji in several
	 * languages.
	 */
	meanings: KanjiEntryMeaning[]
}

/**
 * Type for an `KanjiEntryReading`.
 *
 * - `pinyin` - the modern PinYin romanization of the Chinese reading of
 *   the kanji. The tones are represented by a concluding digit.
 * - `korean_r` - the romanized form of the Korean reading(s) of the kanji.
 *   The readings are in the (Republic of Korea) Ministry of Education style
 *   of romanization.
 * - `korean_h` - the Korean reading(s) of the kanji in hangul.
 * - `vietnam` - the Vietnamese readings.
 * - `ja_on` - the "on" Japanese reading of the kanji, in katakana.
 * - `ja_kun` - the "kun" Japanese reading of the kanji, usually in hiragana.
 *   Where relevant the okurigana is also included separated by a ".".
 *   Readings associated with prefixes and suffixes are marked with a "-".
 */
type KanjiEntryReadingType = 'pinyin' | 'korean_r' | 'korean_h' | 'vietnam' | 'ja_on' | 'ja_kun'

const kanjiEntryReadingType: { [key in KanjiEntryReadingType]: string } = {
	pinyin: '',
	korean_r: '',
	korean_h: '',
	vietnam: '',
	ja_on: '',
	ja_kun: '',
}

function isKanjiEntryReadingType(input: string): input is KanjiEntryReadingType {
	return input in kanjiEntryReadingType
}

/**
 * A reading element for a `KanjiEntryReadingGroup`.
 */
export type KanjiEntryReading = {
	/**
	 * Type for this reading.
	 */
	type: KanjiEntryReadingType

	/**
	 * Value for this reading. The content of this field depends on `type`.
	 */
	value: string
}

/**
 * A meaning element for a `KanjiEntryReadingGroup`.
 */
export type KanjiEntryMeaning = {
	/**
	 * The target language of the meaning coded using the two-letter language
	 * code from the ISO 639-1 standard.
	 */
	lang: string

	/**
	 * The meaning associated with the kanji.
	 */
	text: string
}

/**
 * Dictionary reference element for a `KanjiEntry`.
 */
export type KanjiEntryDict = {
	/**
	 * Name for the `KANJI_ENTRY_DICT_TAG` that references this field.
	 */
	name: string

	/**
	 * Unstructured text containing the reference for the kanji.
	 */
	text: string
}

export const KANJI_ENTRY_DICT_NAMES: Record<string, string> = {
	nelson_c: `"Modern Reader's Japanese-English Character Dictionary", edited by Andrew Nelson (now published as the "Classic" Nelson)`,
	nelson_n: `"The New Nelson Japanese-English Character Dictionary", edited by John Haig`,
	halpern_njecd: `"New Japanese-English Character Dictionary", edited by Jack Halpern`,
	halpern_kkd: `"Kodansha Kanji Dictionary", (2nd Ed. of the NJECD) edited by Jack Halpern`,
	halpern_kkld: `"Kanji Learners Dictionary" (Kodansha) edited by Jack Halpern`,
	halpern_kkld_2ed: `"Kanji Learners Dictionary" (Kodansha), 2nd edition (2013) edited by Jack Halpern`,
	heisig: `"Remembering The Kanji" by James Heisig`,
	heisig6: `"Remembering The Kanji, Sixth Ed." by James Heisig`,
	gakken: `"A New Dictionary of Kanji Usage" (Gakken)`,
	oneill_names: `"Japanese Names", by P.G. O'Neill`,
	oneill_kk: `"Essential Kanji" by P.G. O'Neill`,
	moro: `"Daikanwajiten" compiled by Morohashi`,
	henshall: `"A Guide To Remembering Japanese Characters" by Kenneth G. Henshall`,
	sh_kk: `"Kanji and Kana" by Spahn and Hadamitzky`,
	sh_kk2: `"Kanji and Kana" by Spahn and Hadamitzky (2011 edition)`,
	sakade: `"A Guide To Reading and Writing Japanese" edited by Florence Sakade`,
	jf_cards: `Japanese Kanji Flashcards, by Max Hodges and Tomoko Okazaki (Series 1)`,
	henshall3: `"A Guide To Reading and Writing Japanese" 3rd edition, edited by Henshall, Seeley and De Groot`,
	tutt_cards: `Tuttle Kanji Cards, compiled by Alexander Kask`,
	crowley: `"The Kanji Way to Japanese Language Power" by Dale Crowley`,
	kanji_in_context: `"Kanji in Context" by Nishiguchi and Kono`,
	busy_people: `"Japanese For Busy People" vols I-III, published by the AJLT`,
	kodansha_compact: `"Kodansha Compact Kanji Guide".`,
	maniette: `Codes from Yves Maniette's "Les Kanjis dans la tete" French adaptation of Heisig`,
}

export async function import_entries(filename: string) {
	const start = lib.now()

	const zip = await open_zip(filename)
	const data = await zip.files['kanjidic2.xml'].async('string')
	console.log(`Loaded kanjidic2.xml with ${lib.bytes(data.length)} in ${lib.elapsed(start)}`)

	// This needs to be false because otherwise sax will complain about the
	// text data outside the root element in the XML.
	//
	// Note that this causes all tags and attributes returned by sax to be
	// uppercased.
	const strict = false
	const parser = sax.parser(strict)

	const context = {
		tag: '',
		tags: [] as string[],
		text: [] as string[],
		attr: {} as Record<string, string>,

		cur_entry: null as KanjiEntry | null,
		cur_reading_group: null as KanjiEntryReadingGroup | null,
	}

	const entries = [] as KanjiEntry[]

	const at_pos = () => {
		const entry = context.cur_entry
		const label = entry?.literal || `#${entries.length + 1}`
		const tags = `${context.tags.join('.')}.${context.tag}`
		return `at ${label} (${tags})`
	}

	function push<T>(ls: T[] | undefined, elem: T | null, validate: (elem: T) => string | void) {
		if (!ls) return
		if (!elem) {
			throw new Error(`pushing null element in list ${at_pos()}`)
		}
		const msg = validate(elem)
		if (msg) {
			throw new Error(`pushing invalid element in list: ${msg} ${at_pos()}`)
		}
		ls.push(elem)
	}

	parser.onopentag = (node: sax.Tag) => {
		if (context.tag) {
			context.tags.push(context.tag)
		}
		context.tag = node.name

		context.text.length = 0
		context.attr = {}
		for (const key of Object.keys(node.attributes)) {
			context.attr[key.toLowerCase()] = node.attributes[key]
		}

		switch (node.name.toLowerCase()) {
			case 'character':
				context.cur_entry = {
					literal: '',
					radicals: [],
					grade: null,
					stroke_count: [],
					variant: [],
					frequency: null,
					radical_names: [],
					old_jlpt: null,
					query_codes: [],
					readings_meanings: [],
					nanori: [],
					dict: [],
				}
				break

			case 'rmgroup':
				context.cur_reading_group = {
					readings: [],
					meanings: [],
				}
				break
		}
	}

	parser.onclosetag = (tag) => {
		const text = context.text.join('').trim().replace(/\s+/g, ' ')
		switch (tag.toLowerCase()) {
			// Top level entry
			case 'character':
				push(entries, context.cur_entry, (it) => {
					if (!it.literal) {
						return 'empty entry'
					}
					if (!kana.is_kanji(it.literal)) {
						return `invalid kanji: ${it.literal}`
					}
					if (!it.radicals.length) {
						return 'kanji has no radicals'
					}
					if (!it.stroke_count) {
						return 'kanji has no stroke information'
					}
					if (!it.query_codes) {
						return 'kanji has no query codes'
					}
					if (!it.readings_meanings) {
						return 'kanji has readings/meanings'
					}
					return
				})
				context.cur_entry = null
				break

			case 'literal':
				context.cur_entry!.literal = text
				break

			case 'rad_value': {
				const rad_type = context.attr['rad_type']
				if (!isKanjiEntryRadicalType(rad_type)) {
					throw new Error(`invalid radical type: ${rad_type} ${at_pos()}`)
				}
				push(
					context.cur_entry!.radicals,
					{
						type: rad_type,
						value: parseInt(text, 10),
					},
					(it) => {
						if (isNaN(it.value) || it.value < 1 || it.value > 214) {
							return `invalid radical value: ${text}`
						}
						return
					},
				)
				break
			}

			// Values inside `<misc>`:

			case 'grade': {
				const grade = parseInt(text, 10)
				if (grade >= 1 && grade <= 10) {
					context.cur_entry!.grade = grade
				} else {
					throw new Error(`kanji grade is invalid: ${text} -- ${at_pos()}`)
				}
				break
			}

			case 'jlpt': {
				const jlpt = parseInt(text, 10)
				if (jlpt >= 1 && jlpt <= 5) {
					context.cur_entry!.old_jlpt = jlpt
				} else {
					throw new Error(`kanji JLPT value is invalid: ${text} -- ${at_pos()}`)
				}
				break
			}

			case 'stroke_count': {
				const count = parseInt(text, 10)
				if (count > 0) {
					context.cur_entry!.stroke_count.push(count)
				} else {
					throw new Error(`kanji stroke count is invalid: ${text} -- ${at_pos()}`)
				}
				break
			}

			case 'variant': {
				const var_type = context.attr['var_type']
				if (!isKanjiEntryVariantType(var_type)) {
					throw new Error(`invalid variant type ${var_type} ${at_pos()}`)
				}
				push(context.cur_entry!.variant, { type: var_type, value: text }, (it) => {
					if (!it.value) {
						return `variant has no text ${it.type}`
					}
					return
				})
				break
			}

			case 'freq': {
				const frequency = parseInt(text, 10)
				if (frequency > 0) {
					context.cur_entry!.frequency = frequency
				} else {
					throw new Error(`kanji frequency is invalid: ${text} -- ${at_pos()}`)
				}
				break
			}

			case 'rad_name':
				if (!text) {
					throw new Error(`kanji rad_name is empty`)
				}
				context.cur_entry!.radical_names.push(text)
				break

			// Dictionary references:

			case 'dic_ref': {
				const name = context.attr['dr_type']
				const exists = context.cur_entry!.dict.find((x) => x.name == name && x.text == text)
				!exists &&
					push(context.cur_entry!.dict, { name, text }, (it) => {
						if (!it.name) {
							return `missing dictionary entry name (text is ${it.text})`
						}
						if (!KANJI_ENTRY_DICT_NAMES[it.name]) {
							return `dictionary entry name is unknown: ${it.name}`
						}
						if (context.cur_entry!.dict.find((x) => x.name == it.name && x.text == it.text)) {
							return `duplicated dictionary entry for ${it.name} - ${it.text}`
						}
						if (!it.text) {
							return `missing dictionary entry text for ${it.name}`
						}
						if (it.name == 'moro') {
							const vol = context.attr['m_vol']
							const page = context.attr['m_page']
							const index = [vol ? `volume ${vol}` : ``, page ? `page ${page}` : ``]
								.filter((x) => !!x)
								.join(', ')
							if (index) {
								it.text += ` (${index})`
							}
						}
						return
					})
				break
			}

			// Query codes:
			case 'q_code': {
				const type = context.attr['qc_type']
				let code: KanjiEntryQueryCode | null = null
				const misclass = context.attr['skip_misclass']
				switch (type) {
					case 'skip':
						code = { type, value: text }
						if (!/^([123]-\d{1,2}-\d{1,2}|4-\d{1,2}-[1234])$/.test(code.value)) {
							// 㡀 has a weird skip code, so we just ignore it
							if (context.cur_entry?.literal != '㡀') {
								throw new Error(`invalid skip syntax: ${code.value} ${at_pos()}`)
							}
						}
						if (misclass) {
							if (!isQueryCodeSkipMisclass(misclass)) {
								throw new Error(`invalid skip misclass: ${misclass} ${at_pos()}`)
							}
							code.skip_misclass = misclass
						}
						break
					case 'sh_desc':
						code = { type, value: text }
						break
					case 'four_corner':
						code = { type, value: text }
						break
					case 'deroo':
						code = { type, value: text }
						break
					default:
						throw new Error(`unknown query code type ${type} ${at_pos()}`)
				}
				push(context.cur_entry!.query_codes, code, () => {
					return
				})
				break
			}

			// Readings & Meanings

			case 'rmgroup': {
				push(context.cur_entry!.readings_meanings, context.cur_reading_group, (it) => {
					if (!(it.readings.length + it.meanings.length)) {
						return `empty reading/meaning group`
					}
					return
				})
				break
			}

			case 'reading': {
				const type = context.attr['r_type']
				if (!isKanjiEntryReadingType(type)) {
					throw new Error(`invalid kanji reading type ${type} ${at_pos()}`)
				}

				push(context.cur_reading_group!.readings, { type, value: text }, (it) => {
					if (!it.value) {
						return `reading for ${it.type} is empty`
					}
					return
				})
				break
			}

			case 'meaning': {
				const lang = context.attr['m_lang'] || 'en'
				push(context.cur_reading_group!.meanings, { lang, text }, (it) => {
					if (!/^[a-z]{2}$/.test(it.lang)) {
						return `invalid language '${it.lang}' for meaning ${it.text}`
					}
					if (!it.text) {
						return `meaning for ${it.lang} is empty`
					}
					return
				})
				break
			}

			case 'nanori':
				if (!kana.is_kana(text.replace(/[-.]/g, ''))) {
					throw new Error(`invalid nanori reading: ${text} ${at_pos()}`)
				}
				context.cur_entry!.nanori.push(text)
				break
		}

		context.text.length = 0
		context.tag = context.tags.pop() || ''
	}

	parser.ontext = (text: string) => {
		context.text.push(text)
	}

	const start_xml = lib.now()
	parser.write(data)
	parser.close()
	console.log(`Processed ${entries.length} entries from the XML in ${lib.elapsed(start_xml)}`)

	return entries
}
