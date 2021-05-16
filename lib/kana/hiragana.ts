import { compile, convert, rules } from './conversion'
import { rules_fullwidth_ascii, rules_to_hiragana } from './kana_rules'
import { fullwidth_katakana } from './katakana'

const TO_HIRAGANA = compile(rules_to_hiragana())

/**
 * Converts the input text to hiragana.
 *
 * This works on any mix of romaji and katakana inputs. It will also convert
 * romaji punctuation and spacing to the Japanese equivalents.
 */
export function to_hiragana(input: string) {
	return convert(fullwidth_katakana(input), TO_HIRAGANA)
}

const TO_HIRAGANA_KEY = compile(rules(rules_to_hiragana(), rules_fullwidth_ascii()))

/**
 * Converts the input text to a hiragana key with the purposes of indexing
 * and providing a first pass coarse filter.
 *
 * The objective of this method is to normalize the input in a way that allows
 * keyword lookups to handle differences in input, common typos, and to ignore
 * extraneous characters. This is not meant to preserve the original word or
 * to provide a final match verdict.
 *
 * In particular, this method will:
 *
 * - Convert the input to hiragana (kanji and related non-kana is kept as-is)
 * - Strip voiced and semi-voiced sound marks (e.g. ば→は and ぱ→は)
 * - Convert fullwidth characters to their ASCII counterparts
 * - Strip any non-letter/non-digit character.
 * - Strip long vowels (both `ー` and combinations such as ほう or ええ)
 */
export function to_hiragana_key(input: string) {
	// Do the basic to hiragana conversion with the additional fullwidth to
	// ASCII conversion.
	const hiragana = convert(fullwidth_katakana(input), TO_HIRAGANA_KEY)

	// Map of small to large conversions. Keys must be present in the regexp
	// below. Note that っ is not converted because it is stripped.
	const map: Record<string, string> = {
		ゃ: 'や',
		ゅ: 'ゆ',
		ょ: 'よ',
		ぁ: 'あ',
		ぃ: 'い',
		ぅ: 'う',
		ぇ: 'え',
		ぉ: 'お',
	}

	const result = hiragana
		// Use the NFD normalization to strip sound marks and other accents
		.normalize('NFD')
		// Replace the normal つ from places where it could have been
		// mistaken from a small っ. This includes before consonants and at
		// the end of a word boundary. We don't want to remove it at the
		// beginning of a word boundary.
		//
		// This needs to be processed first because a lot of important
		// context will be removed by the following transformations.
		.replace(
			/(?<!(^|[^\p{L}\p{N}\u3099\u309A]|つ\u3099?))つ(?=($|[^\p{L}\p{N}]|[かきくけこさしすせそたちてとなにぬねのはひふへほまみむめもらりるれろ]))/gu,
			'',
		)
		// Convert small characters to their big versions. This helps with
		// typos and handling long vowels. Note that っ will be stripped
		// later, so we don't want to convert it.
		.replace(/[ゃゅょぁぃぅぇぉ]/g, (c) => map[c] || c)
		// Replace repeated vowels.
		.replace(/([あいうえお])\1+/, (c) => c.charAt(0))
		// Replace this one here before we strip voiced marks because of ヴ.
		.replace(/[う]\u3099?う(?!\u3099)/g, (c) => c.charAt(0))
		// We can finally replace the voiced sound marks.
		.replace(/[\u3099\u309A]/g, '')
		// Replace long vowel pairs. Again, this is to help with typos and
		// the possible ambiguity between a normal and long vowel sound.
		.replace(
			/[かさたなはまやらわ]あ|[えきしちにひみり]い|[おくすつぬふむゆる]う|[けせてねへめれ][えい]|[こそとのほもよろ][おう]/g,
			(c) => c.charAt(0),
		)
		// We need to explicitly remove the small-tsu and long mark.
		.replace(/[ーっ]/g, '')
		// Remove non-letters and digits. Since we converted fullwidth we
		// can handle digits as `0-9` instead of `\p{N}` (unless we want
		// to actually pass things like `➈` through).
		.replace(/[^\p{L}0-9]/gu, '')
		// Back to the NFC normalization.
		.normalize('NFC')

	return result
}
