import { compile, convert } from './conversion'
import { rules_to_hiragana } from './kana_rules'
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
