import sax from 'sax'

import * as lib from '../lib'

import { open_zip } from './files'

export type KanjiEntry = {
	/** The character itself */
	literal: string

	/** Radical elements for this Kanji. */
	radical: KanjiEntryRadical[]

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
	radical_name: string[]

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
	reading_meanings: KanjiEntryReadingGroup[]

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

/** Radical element for a `KanjiEntry`. */
export type KanjiEntryRadical = {
	/**
	 * The radical number, in the range 1 to 214. The particular classification
	 * type is stated in the `type` field.
	 */
	value: number

	/**
	 * The rad_type attribute states the type of radical classification.
	 *
	 * - `classical` - based on the system first used in the KangXi Zidian.
	 *   The Shibano "JIS Kanwa Jiten" is used as the reference source.
	 *
	 * - `nelson_c` - as used in the Nelson "Modern Japanese-English Character
	 *   Dictionary" (i.e. the Classic, not the New Nelson). This will only be
	 *   used where Nelson reclassified the kanji.
	 */
	type: 'classical' | 'nelson_c'
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
	type: 'jis208' | 'jis212' | 'jis213' | 'deroo' | 'njecd' | 's_h' | 'nelson_c' | 'oneill' | 'ucs'
}

/**
 * Query codes for a `KanjiEntry`.
 */
export type KanjiEntryQueryCode = {
	/**
	 * Halpern's SKIP (System of Kanji Indexing by Patterns) code. The format
	 * is `n-nn-nn`.
	 *
	 * There are also a number of misclassification codes, indicated by the
	 * field `skip_misclass`.
	 */
	skip: string | null

	/**
	 * If available, the values of this attribute indicate the type of `skip`
	 * misclassification.
	 *
	 * - `posn` - a mistake in the division of the kanji
	 * - `stroke_count` - a mistake in the number of strokes
	 * - `stroke_and_posn` - mistakes in both division and strokes
	 * - `stroke_diff` - ambiguous stroke counts depending on glyph
	 */
	skip_misclass?: 'posn' | 'stroke_count' | 'stroke_and_posn' | 'stroke_diff'

	/**
	 * The descriptor codes for The Kanji Dictionary (Tuttle 1996) by Spahn
	 * and Hadamitzky. They are in the form `nxnn.n`, e.g. 3k11.2, where the
	 * kanji has 3 strokes in the identifying radical, it is radical "k" in
	 * the SH classification system, there are 11 other strokes, and it is
	 * the 2nd kanji in the 3k11 sequence.
	 */
	sh_desc: string | null

	/**
	 * the "Four Corner" code for the kanji.
	 */
	four_corner: string | null

	/**
	 * The codes developed by the late Father Joseph De Roo, and published
	 * in his book "2001 Kanji" (Bonjinsha).
	 */
	deroo: string | null
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
 * A reading element for a `KanjiEntryReadingGroup`.
 */
export type KanjiEntryReading = {
	/**
	 * Type for this reading.
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
	type: 'pinyin' | 'korean_r' | 'korean_h' | 'vietnam' | 'ja_on' | 'ja_kun'

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

export const KANJI_ENTRY_DICT_TAG = {
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
}
