/**
 * Enumeration for the types of character recognized by the library.
 */
export enum CharKind {
	/** Unrecognized character. */
	NONE = 0,

	//=================//
	// Main categories //
	//=================//

	/**
	 * Any hiragana character, including small versions, archaic, rare, and
	 * iteration marks.
	 */
	HIRAGANA,

	/**
	 * Any katakana character, including small and halfwidth versions, archaic,
	 * rare, and iteration marks.
	 *
	 * NOTE: This does not include the long sound mark, which is classified as
	 * `KANA`.
	 *
	 * @see KANA
	 */
	KATAKANA,

	/**
	 * A symbol used with kana text, such as the long sound mark (`ー` and `ｰ`)
	 * or the masu symbol (`〼`).
	 */
	KANA,

	/**
	 * Any kanji character. This includes non-japanese Kanji and is based
	 * exclusively on Unicode ranges.
	 */
	KANJI,

	/**
	 * Japanese punctuation symbols. The main difference between symbol and
	 * punctuation is that punctuation is transliterated when the japanese
	 * text is romanized.
	 *
	 * Note that this includes the fullwidth ASCII symbol characters used in
	 * Japanese text for their ASCII equivalents.
	 */
	JAPANESE_PUNCTUATION,

	/**
	 * Japanese symbols. Symbols are not part of a word, but also don't affect
	 * romanization (converting from Japanese -> ASCII outputs them as-is).
	 */
	JAPANESE_SYMBOL,

	/**
	 * Any character from the Unicode Space Separator class. This includes
	 * the U+3000 Ideographic Space used for Japanese text.
	 */
	SPACE,

	/**
	 * ASCII characters used in romaji transliteration. This includes the
	 * ranges `A-Z`, `a-z`, as well as `_` and the long vowel variants such
	 * as `āīūēō` and `âîûêô`.
	 *
	 * Note that this does not include the symbols `'` and `-` which can also
	 * be generated as part of the romanization for a word.
	 */
	ROMAJI,

	/**
	 * ASCII punctuation characters. This set includes all characters generated
	 * by the romanization of `JAPANESE_PUNCTUATION`.
	 *
	 * Note: this does not include spaces. This also includes `'` and `-` which
	 * can be considered part of a romanized word.
	 */
	ROMAJI_PUNCTUATION,

	/**
	 * Fullwidth decimal digit characters used in Japanese text for their ASCII
	 * equivalents.
	 */
	ROMAN_DIGIT,

	/**
	 * Fullwidth A-Z and a-z characters used in Japanese text for their ASCII
	 * equivalents.
	 */
	ROMAN_LETTER,

	/**
	 * An Unicode "word character" (e.g. letter or digit) that is not part of
	 * the other sets.
	 *
	 * This consists mostly of non-ROMAJI non-Japanese letters (e.g. accented
	 * characters) that could be considered as part of a word segment, but do
	 * not have an equivalent transliteration in Japanese.
	 *
	 * NOTE: This relies exclusively on Unicode ranges and is provided solely
	 * as an aid for text segmentation.
	 */
	OTHER_WORD,

	/**
	 * An Unicode punctuation character ("P" category) that is not part of the
	 * other sets.
	 */
	OTHER_PUNCTUATION,

	/**
	 * An Unicode graphic symbol that is neither punctuation nor a word
	 * character according to Unicode, and is not part of the other sets.
	 */
	OTHER_SYMBOL,
}

/**
 * Bit flags that return supplemental information about a character.
 */
export enum CharFlags {
	/**
	 * Zero value for the flags.
	 */
	NONE = 0,

	/**
	 * Flag for the small versions of kana characters.
	 *
	 * Relevant for: HIRAGANA | KATAKANA
	 */
	IS_SMALL = 1 << 0,

	/**
	 * Flag for the kana long sound mark (i.e. `ー` and the halfwidth `ｰ`).
	 */
	IS_LONG_MARK = 1 << 1,

	/**
	 * Flag for the iteration marks of kana characters.
	 *
	 * Relevant for: HIRAGANA | KATAKANA
	 */
	IS_MARK = 1 << 2,

	/**
	 * Flags rare or archaic kana characters.
	 *
	 * Relevant for: HIRAGANA | KATAKANA
	 */
	IS_RARE = 1 << 3,

	/**
	 * Flags the halfwidth versions of katakana characters.
	 *
	 * Relevant for: KATAKANA
	 */
	IS_HALFWIDTH = 1 << 4,

	/**
	 * Flags lowercase characters.
	 *
	 * Relevant for: ROMAJI | ROMAN_LETTER | OTHER_WORD
	 */
	IS_LOWER = 1 << 5,

	/**
	 * Flags uppercase characters.
	 *
	 * Relevant for: ROMAJI | ROMAN_LETTER | OTHER_WORD
	 */
	IS_UPPER = 1 << 6,

	/**
	 * Charset agnostic flag for letters, including kana, kanji, ASCII and other
	 * languages.
	 *
	 * Relevant for: HIRAGANA | KATAKANA | KANA | KANJI | ROMAJI | ROMAN_LETTER | OTHER_WORD
	 */
	IS_LETTER = 1 << 7,

	/**
	 * Charset agnostic flag for digits.
	 *
	 * Relevant for: ROMAJI | ROMAN_DIGIT | OTHER_WORD
	 */
	IS_NUMBER = 1 << 8,

	/**
	 * Flags the fullwidth version of ASCII characters used in Japanese text.
	 *
	 * Relevant for: ROMAN_DIGIT | ROMAN_LETTER | JAPANESE_PUNCTUATION | JAPANESE_SYMBOL
	 */
	IS_ASCII_FULLWIDTH = 1 << 9,

	/**
	 * Flags a kanji radical (`U+2E80 - U+2EF3 / U+2F00 - U+2FD5`). Those are
	 * classified as Japanese Symbols.
	 *
	 * Relevant for: JAPANESE_SYMBOL
	 */
	IS_KANJI_RADICAL = 1 << 10,

	//=================//
	// Charset         //
	//=================//

	/**
	 * Flags any character from the Japanese script.
	 *
	 * This consists of all non-ROMAJI and non-OTHER categories, except SPACE
	 * from which the only included character is U+3000 (Japanese Ideographic
	 * Space).
	 *
	 * NOTE: this includes kanji, which is based solely on Unicode ranges and
	 * as such includes non-japanese kanji.
	 *
	 */
	CHAR_JAPANESE = 1 << 11,

	/**
	 * Flags any character from the supported ASCII set. This includes basically
	 * the ROMAJI, ROMAJI_PUNCTUATION, and SPACE (except U+3000).
	 */
	CHAR_ASCII = 1 << 12,
}
