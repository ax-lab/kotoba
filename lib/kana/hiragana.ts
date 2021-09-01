import { compile, convert } from './conversion'
import { rules_ascii_to_fullwidth, rules_fullwidth_to_ascii, rules_to_hiragana } from './kana_rules'
import { fullwidth_katakana } from './katakana'

const TO_HIRAGANA = compile(rules_to_hiragana())

const FULLWIDTH_TO_ASCII = compile(rules_fullwidth_to_ascii())
const ASCII_TO_FULLWIDTH = compile(rules_ascii_to_fullwidth())

/**
 * Converts the input text to hiragana.
 *
 * This works on any mix of romaji and katakana inputs. It will also convert
 * romaji punctuation and spacing to the Japanese equivalents.
 */
export function to_hiragana(input: string, { fullwidth }: { fullwidth?: boolean } = {}) {
	const out = convert(fullwidth_katakana(input), TO_HIRAGANA)
	if (fullwidth == null || fullwidth) {
		return convert(out, ASCII_TO_FULLWIDTH)
	}
	return out
}

/**
 * Converts the input text to a lookup key that can be stored in an index and
 * later used to lookup a search term.
 *
 * The objective of this key is to provide a simplified and normalized term
 * to be used in dictionary lookups as a first-pass coarse filter.
 *
 * For the normalization we want to map the input to an unified character set
 * (e.g. romaji and katakana to hiragana) as well as normalize the unicode.
 *
 * The simplification step removes extraneous characters not useful for the
 * search. This step also has the objective of mapping similar words to a single
 * key in a way that allows the lookup to handle common typos and find words
 * with small orthographic variations.
 *
 * Since this is meant as a first-pass and very coarse filter (i.e. mostly to
 * reduce the search space for performance reasons), this method does not care
 * about discarding word data or providing a precise match. The only concern
 * is that any lookup key transformation are consistent in a way that
 * an otherwise valid match would not be discarded because the generated keys
 * are different.
 *
 * A secondary objective of this method is to keep as much useful context as
 * possible to provide good performance for the key.
 *
 * The actual transformation this method makes to the input is as follows:
 *
 * - Convert romaji and katakana to hiragana and everything else to lowercase.
 * - Fullwidth letters/digits are converted to their ASCII equivalent.
 * - Voiced and semi-voiced sound marks are stripped, e.g. ば／ぱ become `は`.
 * - Small characters are converted to their large variants. The small っ is
 *   completely stripped.
 * - Long vowels are normalized to a single vowel.
 *   - This includes stripping `ー` and removing any number of sequential
 *     repeated vowels such as `ええ`, `ぇぇぇ`, or `えぇ`
 *   - Remaining long vowel pairs such as くう, こう, えい are also converted to
 *     a single vowel (e.g. `く`, `こ`, `え`).
 * - Finally, non-letter/digit characters are stripped from the final result.
 */
export function to_hiragana_key(input: string) {
	// Perform a basic normalization by converting to hiragana. We convert to
	// lowercase for any non-kana/romaji input that cannot be converted.
	const hiragana = to_hiragana(input.toLowerCase())
		// We want to discard any trailing ASCII letters that failed to convert
		// to support the use case of partially typed word in romaji.
		.replace(/[a-z]{1,4}$/g, '')

	// Map of small to large conversions. Keys must be present in the regexp
	// below. Note that っ is not converted because it is stripped out.
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

	const stripped = hiragana
		// Use the NFD normalization to strip sound marks and other accents
		.normalize('NFD')
		// Replace the normal つ from places where it could have been
		// mistaken from a small っ. This includes before consonants and at
		// the end of a word boundary.

		// We don't want to remove it at the beginning of a word boundary. We
		// also don't remove a sequence of つ because it is more likely that
		// those are actual words.
		//
		// Even if it makes the regex more complex, this needs to be processed
		// before later steps because a lot of important context will be removed
		// by the following transformations and we want to avoid removing a つ
		// for a false positive.
		.replace(
			// The first part of the regex `(?<!(...))` makes sure we only
			// remove a つ in the middle of a word, and that does not follow
			// another つ.
			//
			// The latter part `(?=($|[^\p{L}\p{N}]|[...]))` makes it so that
			// the つ will only be removed if what follows is the end of the
			// word or a consonant hiragana.
			/(?<!(^|[^\p{L}\p{N}\u3099\u309A]|つ\u3099?))つ(?=($|[^\p{L}\p{N}\u3099]|[かきくけこさしすせそたちてとなにぬねのはひふへほまみむめもらりるれろ]))/gu,
			'',
		)
		// Convert small characters to their big versions. This helps with a
		// potential source of typos and makes handling everything else easier.
		//
		// Note that っ will be stripped later, so we don't want to convert it.
		.replace(/[ゃゅょぁぃぅぇぉ]/g, (c) => map[c] || c)
		// Replace repeated vowels by a single instance of that vowel. This is
		// part of normalizing long vowels.
		.replace(/([あいうえお])(?:ー*\1)+/g, (c) => c.charAt(0))
		// Handle `ヴ` here before we strip voiced marks and they become
		// ambiguous. This is still not perfect, as we will end up merging a
		// sequence such as `クヴ` down to just `く`.
		.replace(/[う]\u3099う(?!\u3099)/g, (c) => c.charAt(0))
		// We can finally replace the voiced sound marks. We also want to
		// replace the long mark before we handle long vowels.
		.replace(/[\u3099\u309Aー]/g, '')
		// Replace long vowel pairs.
		.replace(
			/[かさたなはまやらわ]あ|[えきしちにひみり]い|[おくすつぬふむゆる]う|[けせてねへめれ][えい]|[こそとのほもよろ][おう]/g,
			(c) => c.charAt(0),
		)
		// Finally we explicitly remove the small-tsu.
		.replace(/[っ]/g, '')

	// Convert remaining fullwidth characters to ASCII, then remove any
	// remaining non-letter/digit character before normalizing.
	const result = convert(stripped, FULLWIDTH_TO_ASCII)
		// Remove non-letters and digits. Since we converted fullwidth we
		// can handle digits as `0-9` instead of `\p{N}` (unless we want
		// to actually pass things like `➈` through).
		.replace(/[^\p{L}0-9]/gu, '')
		// Back to the NFC normalization.
		.normalize('NFC')

	return result
}
