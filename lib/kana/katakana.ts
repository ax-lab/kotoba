import { compile, convert } from './conversion'
import { rules_to_katakana } from './kana_rules'

const TO_KATAKANA = compile(rules_to_katakana())

/**
 * Converts the input text to katakana.
 *
 * This works on any mix of romaji and hiragana inputs. It will also convert
 * romaji punctuation and spacing to the Japanese equivalents.
 */
export function to_katakana(input: string) {
	return convert(fullwidth_katakana(input), TO_KATAKANA)
}

/**
 * Converts halfwidth katakana to fullwidth.
 */
export function fullwidth_katakana(input: string) {
	const map: { [index: string]: string } = {
		ｰ: 'ー', // Prolonged sound mark
		ｦ: 'ヲ', // Letter Wo
		ｧ: 'ァ', // Letter Small A
		ｨ: 'ィ', // Letter Small I
		ｩ: 'ゥ', // Letter Small U
		ｪ: 'ェ', // Letter Small E
		ｫ: 'ォ', // Letter Small O
		ｬ: 'ャ', // Letter Small Ya
		ｭ: 'ュ', // Letter Small Yu
		ｮ: 'ョ', // Letter Small Yo
		ｯ: 'ッ', // Letter Small Tu
		ｱ: 'ア', // Letter A
		ｲ: 'イ', // Letter I
		ｳ: 'ウ', // Letter U
		ｴ: 'エ', // Letter E
		ｵ: 'オ', // Letter O
		ｶ: 'カ', // Letter Ka
		ｷ: 'キ', // Letter Ki
		ｸ: 'ク', // Letter Ku
		ｹ: 'ケ', // Letter Ke
		ｺ: 'コ', // Letter Ko
		ｻ: 'サ', // Letter Sa
		ｼ: 'シ', // Letter Si
		ｽ: 'ス', // Letter Su
		ｾ: 'セ', // Letter Se
		ｿ: 'ソ', // Letter So
		ﾀ: 'タ', // Letter Ta
		ﾁ: 'チ', // Letter Ti
		ﾂ: 'ツ', // Letter Tu
		ﾃ: 'テ', // Letter Te
		ﾄ: 'ト', // Letter To
		ﾅ: 'ナ', // Letter Na
		ﾆ: 'ニ', // Letter Ni
		ﾇ: 'ヌ', // Letter Nu
		ﾈ: 'ネ', // Letter Ne
		ﾉ: 'ノ', // Letter No
		ﾊ: 'ハ', // Letter Ha
		ﾋ: 'ヒ', // Letter Hi
		ﾌ: 'フ', // Letter Hu
		ﾍ: 'ヘ', // Letter He
		ﾎ: 'ホ', // Letter Ho
		ﾏ: 'マ', // Letter Ma
		ﾐ: 'ミ', // Letter Mi
		ﾑ: 'ム', // Letter Mu
		ﾒ: 'メ', // Letter Me
		ﾓ: 'モ', // Letter Mo
		ﾔ: 'ヤ', // Letter Ya
		ﾕ: 'ユ', // Letter Yu
		ﾖ: 'ヨ', // Letter Yo
		ﾗ: 'ラ', // Letter Ra
		ﾘ: 'リ', // Letter Ri
		ﾙ: 'ル', // Letter Ru
		ﾚ: 'レ', // Letter Re
		ﾛ: 'ロ', // Letter Ro
		ﾜ: 'ワ', // Letter Wa
		ﾝ: 'ン', // Letter N
	}
	return input.replace(/[\uFF66-\uFF9D]/g, (s) => map[s] || s)
}
