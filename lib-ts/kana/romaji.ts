import { remove_accents } from './chars'
import { compile, convert } from './conversion'
import { rules_to_romaji } from './kana_rules'
import { fullwidth_katakana } from './katakana'

const TO_ROMAJI = compile(rules_to_romaji())

/**
 * Converts any kana in the input text to romaji.
 *
 * This works on any mix of hiragana and katakana inputs. It will also convert
 * any Japanese punctuation and spacing to latin equivalents (mostly ASCII).
 */
export function to_romaji(input: string) {
	return convert(fullwidth_katakana(input), TO_ROMAJI)
}

/**
 * Converts the input text to a "romaji key" with the purpose of indexing a
 * word in kana for searching.
 *
 * The key is a simplified version of the romaji reading for the input which
 * normalizes long vowels, double consonants, and strips extraneous outside of
 * the basic ASCII range.
 *
 * The exact processing is as follows:
 * - The key is stripped of non-japanese combining characters (e.g. accents).
 * - The result is converted to romaji using `to_romaji` and lowercased.
 * - Long vowels and double consonants are collapsed from the romaji result.
 * - Any character outside of A-Z is stripped, including spaces.
 *
 * The result is a string key with characters a-z which approximates the romaji
 * reading for the word, but normalizes similar words to a single key.
 *
 * The purpose of removing long vowels and double consonants in particular is
 * to allow different representations of a word to map to a single key. It also
 * makes the key (and the search based on it) lenient towards more common typing
 * mistakes such as forgetting a long vowel or small tsu in a word.
 */
export function to_romaji_key(input: string) {
	const long: { [key: string]: string } = {
		ā: 'a',
		ī: 'i',
		ū: 'u',
		ē: 'e',
		ō: 'o',
		â: 'a',
		î: 'i',
		û: 'u',
		ê: 'e',
		ô: 'o',
	}
	const romaji = to_romaji(remove_accents(input)).toLowerCase().normalize()
	const vowels = romaji.replace(/[āīūēōâîûêô]/g, (match) => long[match])
	const repeat = vowels.replace(/([a-z])\1+/g, (match) => match[0])
	const digraphs = repeat.replace(/ou|ei/g, (match) => (match == 'ou' ? 'o' : 'e'))
	return digraphs.replace(/[^a-z]/g, '')
}
