import sax from 'sax'

import * as lib from '../lib'

import { open_zip } from './util'

/**
 * Data for an entry from the XML file.
 *
 * This directly correlates to the structure and information in the `<entry>`
 * tag. For more information check `jmdict_english.md` in the `data` directory
 * docs.
 */
export type Entry = {
	/**
	 * A unique numeric sequence number for each entry.
	 *
	 * Corresponds to `ent_seq` in XML.
	 */
	sequence: string

	/**
	 * Kanji elements, if any.
	 *
	 * The overwhelming majority of entries will have a single kanji element
	 * associated with a word in Japanese. Where there are multiple kanji
	 * elements within an entry, they will be orthographical variants of the
	 * same word. Common "mis-spellings" may be included, provided they are
	 * associated with appropriate information fields.
	 */
	kanji: EntryKanji[]

	/**
	 * The reading element typically contains the valid readings of the word(s)
	 * in the kanji element using modern kanadzukai.
	 *
	 * Where there are multiple reading elements, they will typically be
	 * alternative readings of the kanji element. In the absence of a kanji
	 * element, i.e. in the case of a word or phrase written entirely in kana,
	 * these elements will define the entry.
	 */
	reading: EntryReading[]

	/**
	 * The sense element will record the translational equivalent of the
	 * Japanese word, plus other related information. Where there are several
	 * distinctly different meanings of the word, multiple sense elements will
	 * be employed.
	 */
	sense: EntrySense[]
}

/**
 * Contains information for the kanji element of an `Entry`.
 *
 * Corresponds to `k_ele` in XML.
 */
export type EntryKanji = {
	/**
	 * This element will contain a word or short phrase in Japanese
	 * which is written using at least one non-kana character (usually kanji,
	 * but can be other characters, including other alphabets in exceptional
	 * cases).
	 *
	 * Corresponds to the `keb` element in XML.
	 */
	expr: string

	/**
	 * List of tags related specifically to the orthography of `expr`, and will
	 * typically indicate some unusual aspect, such as okurigana irregularity.
	 *
	 * Corresponds to the `ke_inf` element in XML.
	 */
	info: string[]

	/**
	 * Labels related to information about the relative priority of the entry,
	 * and consist of codes indicating the word appears in various references
	 * which can be taken as an indication of the frequency with which the word
	 * is used.
	 *
	 * Note that readings can have their own labels as well. The reason both the
	 * kanji and reading elements are tagged is because on occasions a priority
	 * is only associated with a particular kanji/reading pair.
	 *
	 * Current tags are:
	 *
	 * - `news1/2`: appears in the "wordfreq" file compiled from the Mainichi
	 *   Shimbun newspaper. Words in the first 12,000 in that file are marked
	 *   "news1" and words in the second 12,000 are marked "news2".
	 *
	 * - `ichi1/2`: appears in the "Ichimango goi bunruishuu". Entries marked
	 *   "ichi2" were demoted from "ichi1" because they were observed to have
	 *    low frequencies in the WWW and newspapers.
	 *
	 * - `spec1/2`: a small number of words use this marker when they are
	 *   detected as being common, but are not included in other lists.
	 *
	 * - `gai1/2`: common loanwords, based on the wordfreq file.
	 *
	 * - `nfxx`: this is an indicator of frequency-of-use ranking in the
	 *   wordfreq file. "xx" is the number of the set of 500 words in which
	 *   the entry can be found, with "01" assigned to the first 500, "02"
	 *   to the second, and so on.
	 *
	 * The entries with news1, ichi1, spec1, spec2 and gai1 values are marked
	 * as "popular" in the EDICT and EDICT2 files.
	 *
	 * Corresponds to the `ke_pri` element in XML.
	 */
	priority: string[]
}

/**
 * Contains information for the reading element of an `Entry`.
 *
 * Corresponds to `r_ele` in XML.
 */
export type EntryReading = {
	/**
	 * Reading restricted to kana and related characters such as chouon and
	 * kurikaeshi. Kana usage will be consistent between the kanji and reading
	 * elements (e.g. if one contains katakana, so will the other).
	 *
	 * Corresponds to `reb` in XML.
	 */
	expr: string

	/**
	 * Indicates that the reading, while associated with the kanji, cannot be
	 * regarded as a true reading of the kanji. It is typically used for words
	 * such as foreign place names, gairaigo which can be in kanji or katakana,
	 * etc.
	 *
	 * Corresponds to `re_nokanji` in XML.
	 */
	no_kanji: boolean

	/**
	 * This element is used to indicate when the reading only applies to a
	 * subset of the kanji elements in the entry. In its absence, all readings
	 * apply to all kanji elements. The contents of this element must exactly
	 * match those of one of the kanji elements.
	 *
	 * Corresponds to `re_restr` in XML.
	 */
	restrict: string[]

	/**
	 * Tags pertaining to the specific reading. Typically it will be used to
	 * indicate some unusual aspect of the reading.
	 *
	 * Corresponds to `re_inf` in XML.
	 */
	info: string[]

	/**
	 * Labels related to information about the relative priority of the entry.
	 *
	 * See the correspondent field in `EntryKanji` for details.
	 *
	 * Corresponds to `re_pri` in XML.
	 */
	priority: string[]
}

/**
 * Contains information for the sense element of an `Entry`.
 *
 * Corresponds to `sense` in XML.
 */
export type EntrySense = {
	/**
	 * If present, indicate that the sense is restricted to the lexeme
	 * represented by the respective kanji element.
	 *
	 * Corresponds to `stagk` in XML.
	 */
	stag_kanji: string[]

	/**
	 * If present, indicate that the sense is restricted to the lexeme
	 * represented by the respective reading element.
	 *
	 * Corresponds to `stagr` in XML.
	 */
	stag_reading: string[]

	/**
	 * Tags corresponding to part-of-speech information about the entry/sense.
	 *
	 * In general where there are multiple senses in an entry, the part-of-speech
	 * of an earlier sense will apply to later senses unless there is a new
	 * part-of-speech indicated.
	 *
	 * Corresponds to `pos` in XML.
	 */
	pos: string[]

	/**
	 * This element is used to indicate a cross-reference to another entry with
	 * a similar or related meaning or sense. The content of this element is
	 * typically a kanji or reading element in another entry. In some cases the
	 * kanji will be followed by reading and/or sense number to provide a precise
	 * target for the cross-reference. Where this happens, a JIS "centre-dot"
	 * (0x2126) is placed between the components of the cross-reference. The
	 * target kanji or reading must not contain a centre-dot.
	 *
	 * Corresponds to `xref` in XML.
	 */
	xref: string[]

	/**
	 * This element is used to indicate another entry which is an antonym of
	 * the current entry/sense. The content of this element must exactly match
	 * that of a kanji or reading element in another entry.
	 *
	 * Corresponds to `ant` in XML.
	 */
	antonym: string[]

	/**
	 * Tags with information about the field of application of the entry/sense.
	 * When absent, general application is implied.
	 *
	 * Corresponds to `field` in XML.
	 */
	field: string[]

	/**
	 * Tags used for other relevant information about the entry/sense. As with
	 * part-of-speech, information will usually apply to several senses.
	 *
	 * Corresponds to `misc` in XML.
	 */
	misc: string[]

	/**
	 * The sense-information elements provided for additional information to be
	 * recorded about a sense. Typical usage would be to indicate such things
	 * as level of currency of a sense, the regional variations, etc.
	 *
	 * Corresponds to `s_inf` in XML.
	 */
	info: string[]

	/**
	 * For words specifically associated with regional dialects in Japanese,
	 * will contain tags for that dialect (e.g. ksb for Kansaiben).
	 *
	 * Corresponds to `dial` in XML.
	 */
	dialect: string[]

	/**
	 * This element records the information about the source language(s) of a
	 * loan-word/gairaigo. The element value is the source word or phrase.
	 *
	 * Corresponds to `lsource` in XML.
	 */
	sources: EntrySenseSource[]

	/**
	 * Within each sense will be one or more glossary entries, i.e. words or
	 * phrases which are equivalents to the Japanese word. This element would
	 * normally be present, however it may be omitted in entries which are
	 * purely for a cross-reference.
	 *
	 * Corresponds to `gloss` in XML.
	 */
	glossary: EntrySenseGlossary[]
}

/**
 * Language source for an `EntrySense`.
 *
 * Corresponds to `lsource` in XML.
 */
export type EntrySenseSource = {
	/**
	 * The language from which a loanword is drawn. It will be coded using the
	 * three-letter language code from the ISO 639-2 standard.
	 *
	 * Corresponds to the `xml:lang` attribute for `lsource` in XML.
	 */
	lang: string

	/**
	 * Indicates whether the source element fully or partially describes the
	 * source word or phrase of the loanword.
	 *
	 * Corresponds to the `ls_type` attribute for `lsource` in XML.
	 */
	partial?: boolean

	/**
	 * Indicates that the Japanese word has been constructed from words in the
	 * source language, and not from an actual phrase in that language. Most
	 * commonly used to indicate "waseieigo".
	 */
	wasei?: boolean
}

/**
 * Glossary element for an `EntrySense`.
 *
 * Corresponds to `gloss` in XML.
 */
export type EntrySenseGlossary = {
	/**
	 * Text for the glossary entry.
	 */
	text: string

	/**
	 * Specifies that the glossary is of a particular type.
	 *
	 * Maps from the `g_type` attribute for the `gloss` entry in XML.
	 */
	type?: 'literal' | 'figurative' | 'explanation'
}

export async function import_entries(filename: string) {
	const start = lib.now()

	const zip = await open_zip(filename)
	const data = await zip.files['data.xml'].async('string')
	console.log(`Loaded data.xml with ${lib.bytes(data.length)} in ${lib.elapsed(start)}`)

	const strict = true
	const parser = sax.parser(strict)

	// Process the first part of the file for entities. Entities have the
	// format `<!ENTITY hob "Hokkaido-ben">`
	const matches = data.slice(0, 256 * 1024).matchAll(/<!ENTITY\s+([-\w]+)\s+"([^"]+)"\s*>/g)
	const tags: Record<string, string> = {}
	for (const it of matches) {
		const [, entity, label] = it
		tags[entity] = label
		parser.ENTITIES[entity] = `<<tag:${entity}>>` // we want to preserve the entity tag
	}

	// This is present on the last entry, but undeclared.
	parser.ENTITIES['unc'] = '<<tag:unc>>'

	const context = {
		tag: '',
		tags: [] as string[],
		text: [] as string[],
		attr: {} as Record<string, string>,
	}

	parser.onopentag = (node: sax.Tag) => {
		if (context.tag) {
			context.tags.push(context.tag)
		}
		context.tag = node.name
		context.text.length = 0
		context.attr = { ...node.attributes }
	}

	parser.onclosetag = () => {
		context.text.length = 0
		context.tag = context.tags.pop() || ''
	}

	parser.ontext = (text) => {
		context.text.push(text)
	}

	const start_xml = lib.now()
	parser.write(data)
	parser.close()
	console.log(`Processed XML in ${lib.elapsed(start_xml)}`)
}
