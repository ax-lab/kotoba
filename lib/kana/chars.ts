/**
 * Methods to test and extract characters from a Japanese-related text string.
 *
 * @packageDocumentation
 */

import { TABLE as CHAR_TABLE } from './chars_table'
import { CharFlags, CharKind } from './chars_types'

export * from './chars_types'

/**
 * Check if the entire string is composed of kana characters.
 */
export function is_kana(input: string): boolean {
	if (!input) {
		return false
	}

	for (const chr of input) {
		const it = CHAR_TABLE[chr]
		if (!it) {
			return false
		}
		switch (it[0]) {
			case CharKind.KANA:
			case CharKind.HIRAGANA:
			case CharKind.KATAKANA:
				break
			default:
				return false
		}
	}

	return true
}

/**
 * Looks up information about a single character unit. Character units are
 * generally a single Unicode codepoint, but can also include combining marks
 * for non-normalized or rare characters.
 *
 * This is designed to be used with the output of `nextChar` (possibly after
 * being cleaned up by `removeAccents`).
 *
 * The main purpose of this function is to be used for segmentation of Japanese
 * text (both native and Romaji). It also provides some general Unicode info
 * for convenience when processing general text (e.g. in a multi-idiom
 * context).
 *
 * This function uses lookup tables for the most common characters and then
 * fallsback to regular expressions based on Unicode ranges.
 */
export function get_char_info(char: string): readonly [CharKind, CharFlags] | undefined {
	if (!char) {
		return undefined
	}

	const res = CHAR_TABLE[char]
	if (res) {
		return res
	}

	// const RE_KANJI = /^$/u
	const RE_KANJI = /^[\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{F900}-\u{FAFF}\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}]$/u

	// Test the char using regular expressions
	if (RE_KANJI.test(char)) {
		return [CharKind.KANJI, CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER]
	}

	if (/^[\p{Lu}][\p{M}]*$/u.test(char)) {
		return [CharKind.OTHER_WORD, CharFlags.IS_LETTER | CharFlags.IS_UPPER]
	}

	if (/^[\p{Ll}][\p{M}]*$/u.test(char)) {
		return [CharKind.OTHER_WORD, CharFlags.IS_LETTER | CharFlags.IS_LOWER]
	}

	if (/^[\p{L}][\p{M}]*$/u.test(char)) {
		return [CharKind.OTHER_WORD, CharFlags.IS_LETTER]
	}

	if (/^[\p{N}][\p{M}]*$/u.test(char)) {
		return [CharKind.OTHER_WORD, CharFlags.IS_NUMBER]
	}

	if (/^[\p{P}]$/u.test(char)) {
		return [CharKind.OTHER_PUNCTUATION, CharFlags.NONE]
	}

	if (/^[\p{S}]$/u.test(char)) {
		return [CharKind.OTHER_SYMBOL, CharFlags.NONE]
	}

	return [CharKind.NONE, 0]
}

/**
 * Returns the first Unicode character in the string.
 *
 * This method handles UTF-16 surrogate pairs and combining marks, returning
 * them as a single unit.
 */
export function next_char(input: string): string {
	const m = /^[\s\S][\p{M}]*/u.exec(input)
	return m ? m[0] : ''
}

/**
 * Removes any unsupported combining marks from the Unicode string, effectively
 * stripping accents and other decoration from characters, while keeping valid
 * marks for Japanese/Romaji text.
 *
 * Returns a normalized NFC string.
 *
 * This will:
 *
 * - Strip combining marks from A-Z characters, except the long vowel accented
 *   variants used by romanization (e.g. `āīūēō` and `âîûêô`).
 * - Strip invalid combining voiced `゛` and semi-voiced `゜` sound marks from
 *   the text, while keeping it for valid hiragana/katakana combinations.
 * - If and only if `stripAnyLanguage` is true, this will also strip combining
 *   marks from all other Unicode characters. Otherwise, only A-Z character
 *   will be affected.
 */
export function remove_accents(input: string, stripAnyLanguage?: boolean): string {
	// Relevant Unicode characters:
	//
	// U+0302 - Combining Circumflex Accent
	// U+0304 - Combining Macron
	// U+3099 - Combining Katakana-Hiragana Voiced Sound Mark (tenten)
	// U+309A - Combining Katakana-Hiragana Semi-Voiced Sound Mark (maru)

	const RE_VOWEL = /^[AEIOUaeiou]/

	const firstMatchChar = (s: string, re: RegExp) => {
		const index = s.search(re)
		return index >= 0 ? s[index] : ''
	}
	const expanded = input.normalize('NFD')

	// If stripAnyLanguage is true we strip all marks, except for the combining
	// voiced marks used in hiragana/katakana and marks from vowels. Those get
	// processed below.
	const strippedAll = stripAnyLanguage
		? expanded.replace(/(^|[^\p{M}]?)([\p{M}]+)/gu, (match, p0: string, p1: string) => {
				// Vowels need special processing to preserve long vowel
				// variants used in romanization.
				if (RE_VOWEL.test(p0)) {
					return match
				}

				// Strip any marks, while preserving combining voiced sound
				// marks since those get processed later.
				const marks = p1.replace(/[^\u{3099}\u{309A}]/gu, '')
				return p0 + marks
		  })
		: expanded

	// Match all A-Z character followed by a sequence of marks. Strip all marks
	// except for a single combining U+0302 (circumflex accent) or U+0304 (macron).
	const strippedAZ = strippedAll.replace(/([A-Za-z])([\p{M}]+)/gu, (match, p0: string, p1: string) =>
		RE_VOWEL.test(p0) ? p0 + firstMatchChar(p1, /[\u{0302}\u{0304}]/u) : p0,
	)

	// At this point, the only combining marks left to process should be the
	// kana voiced/semi-voiced sound marks:

	const HIRAGANA_WITH_TENTEN = 'うかきくけこさしすせそたちつてとはひふへほわゐゑをゝ'
	const HIRAGANA_WITH_MARU = 'はひふへほ'

	const KATAKANA_WITH_TENTEN = 'ウカキクケコサシスセソタチツテトハヒフヘホワヰヱヲヽ'
	const KATAKANA_WITH_MARU = 'ハヒフヘホ'

	const HALFKANA_WITH_TENTEN = 'ｳｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾊﾋﾌﾍﾎﾜ'
	const HALFKANA_WITH_MARU = 'ﾊﾋﾌﾍﾎ'

	const KANA_WITH_TENTEN = `${HIRAGANA_WITH_TENTEN}${KATAKANA_WITH_TENTEN}${HALFKANA_WITH_TENTEN}`
	const KANA_WITH_MARU = `${HIRAGANA_WITH_MARU}${KATAKANA_WITH_MARU}${HALFKANA_WITH_MARU}`

	const COMBINING_TENTEN = '\u{3099}'
	const COMBINING_MARU = '\u{309A}'

	// Match all kana voiced marks, optionally preceded by a non-mark character.
	//
	// We match the preceding character to the valid kana combinations.
	const output = strippedAZ.replace(/([^\p{M}]?)([\u{3099}\u{309A}]+)/gu, (match, p0: string, p1: string) => {
		const mark = p1[0]
		const keep =
			(mark == COMBINING_TENTEN && KANA_WITH_TENTEN.indexOf(p0) >= 0) ||
			(mark == COMBINING_MARU && KANA_WITH_MARU.indexOf(p0) >= 0)
		if (keep && p0) {
			return p0 + mark
		} else {
			return p0
		}
	})

	return output.normalize()
}
