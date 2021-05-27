import sax from 'sax'

import * as lib from '../lib'

import { open_zip } from './files'

export const LIST_SEPARATOR = '||'

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
	 * JLPT level for the entry.
	 *
	 * Note that levels are compiled from `http://www.tanos.co.uk/jlpt/` and
	 * are non-official.
	 *
	 * Some entries appear in more than one list. This is the highest level
	 * for any of the kanji/readings in this entry.
	 */
	jlpt?: number

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
	no_kanji?: boolean

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

	/**
	 * List of pitch information for the reading.
	 *
	 * Each entry is a pitch with the format `INFO:TAGS` where:
	 * - `INFO` is the numeric value for the pitch.
	 * - `TAGS` is a comma-separated list of tag names for the entry.
	 */
	pitches: string[]
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
	stag_kanji?: string[]

	/**
	 * If present, indicate that the sense is restricted to the lexeme
	 * represented by the respective reading element.
	 *
	 * Corresponds to `stagr` in XML.
	 */
	stag_reading?: string[]

	/**
	 * Tags corresponding to part-of-speech information about the entry/sense.
	 *
	 * In general where there are multiple senses in an entry, the part-of-speech
	 * of an earlier sense will apply to later senses unless there is a new
	 * part-of-speech indicated.
	 *
	 * Corresponds to `pos` in XML.
	 */
	pos?: string[]

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
	xref?: string[]

	/**
	 * This element is used to indicate another entry which is an antonym of
	 * the current entry/sense. The content of this element must exactly match
	 * that of a kanji or reading element in another entry.
	 *
	 * Corresponds to `ant` in XML.
	 */
	antonym?: string[]

	/**
	 * Tags with information about the field of application of the entry/sense.
	 * When absent, general application is implied.
	 *
	 * Corresponds to `field` in XML.
	 */
	field?: string[]

	/**
	 * Tags used for other relevant information about the entry/sense. As with
	 * part-of-speech, information will usually apply to several senses.
	 *
	 * Corresponds to `misc` in XML.
	 */
	misc?: string[]

	/**
	 * The sense-information elements provided for additional information to be
	 * recorded about a sense. Typical usage would be to indicate such things
	 * as level of currency of a sense, the regional variations, etc.
	 *
	 * Note that this is a free text field.
	 *
	 * Corresponds to `s_inf` in XML.
	 */
	info?: string[]

	/**
	 * For words specifically associated with regional dialects in Japanese,
	 * will contain tags for that dialect (e.g. ksb for Kansaiben).
	 *
	 * Corresponds to `dial` in XML.
	 */
	dialect?: string[]

	/**
	 * This element records the information about the source language(s) of a
	 * loan-word/gairaigo. The element value is the source word or phrase.
	 *
	 * Corresponds to `lsource` in XML.
	 */
	source?: EntrySenseSource[]

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
	 * Text for the entry. If available, is the source word or phrase.
	 */
	text: string

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
		parser.ENTITIES[entity] = `${entity}` // we want to preserve the entity tag
	}

	// This is present on the last entry, but undeclared.
	parser.ENTITIES['unc'] = 'unc'

	const context = {
		tag: '',
		tags: [] as string[],
		text: [] as string[],
		attr: {} as Record<string, string>,

		cur_entry: null as Entry | null,
		cur_kanji: null as EntryKanji | null,
		cur_reading: null as EntryReading | null,
		cur_sense: null as EntrySense | null,
		cur_source: null as EntrySenseSource | null,
		cur_glossary: null as EntrySenseGlossary | null,
	}

	const entries = [] as Entry[]

	const at_pos = () => {
		const entry = context.cur_entry
		const label = entry?.kanji.length ? entry.kanji[0].expr : entry?.reading.length && entry.reading[0].expr
		const tags = `${context.tags.join('.')}.${context.tag}`
		return label ? `at ${label} (${tags})` : `at ${tags}`
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

	function push_text(ls: string[], text: string) {
		if (/\n|\|\|/.test(text)) {
			throw new Error(`text contains invalid characters: ${text}`)
		}
		if (text) {
			ls.push(text)
		}
	}

	function push_tag(ls: string[], tag: string) {
		if (tag == 'unc') {
			return
		}
		if (!tags[tag]) {
			throw new Error(`invalid tag: ${tag} ${at_pos()}`)
		}
		ls.push(tag)
	}

	function push_priority(ls: string[], tag: string) {
		if (!/^(news[12]|ichi[12]|spec[12]|gai[12]|nf\d\d)$/.test(tag)) {
			throw new Error(`invalid priority tag: ${tag} ${at_pos()}`)
		}
		ls.push(tag)
	}

	parser.onopentag = (node: sax.Tag) => {
		if (context.tag) {
			context.tags.push(context.tag)
		}
		context.tag = node.name

		context.text.length = 0
		context.attr = { ...node.attributes }

		switch (node.name) {
			// Top level entry
			case 'entry':
				context.cur_entry = {
					sequence: '',
					kanji: [],
					reading: [],
					sense: [],
				}
				break

			// Kanji element
			case 'k_ele':
				context.cur_kanji = {
					expr: '',
					info: [],
					priority: [],
				}
				break

			// Reading element
			case 'r_ele':
				context.cur_reading = {
					expr: '',
					info: [],
					priority: [],
					restrict: [],
					pitches: [],
				}
				break
			case 're_nokanji':
				context.cur_reading!.no_kanji = true
				break

			// Sense element
			case 'sense':
				context.cur_sense = {
					antonym: [],
					dialect: [],
					field: [],
					glossary: [],
					info: [],
					misc: [],
					pos: [],
					source: [],
					stag_kanji: [],
					stag_reading: [],
					xref: [],
				}
				break
			case 'lsource':
				context.cur_source = {
					lang: node.attributes['xml:lang'] || 'eng',
					text: '',
				}
				if (node.attributes['ls_type'] == 'part') {
					context.cur_source.partial = true
				}
				if (node.attributes['ls_wasei']) {
					context.cur_source.wasei = true
				}
				break
			case 'gloss':
				context.cur_glossary = {
					text: '',
				}
				switch (node.attributes['g_type']) {
					case 'lit':
						context.cur_glossary.type = 'literal'
						break
					case 'fig':
						context.cur_glossary.type = 'figurative'
						break
					case 'expl':
						context.cur_glossary.type = 'explanation'
						break
				}
				break
		}
	}

	parser.onclosetag = (tag) => {
		const text = context.text.join('').trim().replace(/\s+/g, ' ')
		switch (tag.toLowerCase()) {
			// Top level entry
			case 'entry':
				push(entries, context.cur_entry, (it) => {
					if (it.kanji.length + it.reading.length == 0) {
						return 'empty entry'
					}
					if (!it.sense.length) {
						return 'entry has no sense information'
					}
					if (!it.sequence) {
						return 'entry has no sequence number'
					}
					return
				})
				context.cur_entry = null
				break
			case 'ent_seq':
				context.cur_entry!.sequence = text
				break

			// Kanji element
			case 'k_ele':
				push(context.cur_entry!.kanji, context.cur_kanji, (it) => {
					if (!it.expr) {
						return 'kanji element is empty'
					}
					return
				})
				context.cur_kanji = null
				break
			case 'keb':
				context.cur_kanji!.expr = text
				break
			case 'ke_inf':
				push_tag(context.cur_kanji!.info, text)
				break
			case 'ke_pri':
				push_priority(context.cur_kanji!.priority, text)
				break

			// Reading element
			case 'r_ele':
				push(context.cur_entry!.reading, context.cur_reading, (it) => {
					if (!it.expr) {
						return 'reading element is empty'
					}
					return
				})
				context.cur_reading = null
				break
			case 'reb':
				context.cur_reading!.expr = text
				break
			case 're_restr':
				push_text(context.cur_reading!.restrict, text)
				break
			case 're_inf':
				push_tag(context.cur_reading!.info, text)
				break
			case 're_pri':
				push_priority(context.cur_reading!.priority, text)
				break

			// Sense element
			case 'sense':
				push(context.cur_entry!.sense, context.cur_sense, (it) => {
					if (!it.glossary.length) {
						return 'sense element is empty'
					}
					return
				})
				context.cur_sense = null
				break
			case 'lsource':
				context.cur_source!.text = text
				push(context.cur_sense!.source, context.cur_source, (it) => {
					if (!it.text && !it.lang) {
						return 'sense language source is empty'
					}
					if (!it.lang) {
						return 'sense language source has no language information'
					}
					return
				})
				context.cur_source = null
				break
			case 'gloss':
				context.cur_glossary!.text = text
				push(context.cur_sense!.glossary, context.cur_glossary, (it) => {
					if (!it.text) {
						return 'sense glossary is empty'
					}
					return
				})
				context.cur_glossary = null
				break
			case 'dial':
				push_tag(context.cur_sense!.dialect!, text)
				break
			case 'pos':
				push_tag(context.cur_sense!.pos!, text)
				break
			case 'stagk':
				push_text(context.cur_sense!.stag_kanji!, text)
				break
			case 'stagr':
				push_text(context.cur_sense!.stag_reading!, text)
				break
			case 'xref':
				push_text(context.cur_sense!.xref!, text)
				break
			case 'ant':
				push_text(context.cur_sense!.antonym!, text)
				break
			case 'field':
				push_tag(context.cur_sense!.field!, text)
				break
			case 'misc':
				push_text(context.cur_sense!.misc!, text)
				break
			case 's_inf':
				push_text(context.cur_sense!.info!, text)
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

	return { entries, tags }
}
