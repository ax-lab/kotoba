import { describe, expect, test } from '../testutil'

import { to_hiragana, to_hiragana_key } from './hiragana'
import * as testkana from './testkana'

describe('to_hiragana', () => {
	test('should accept empty string', () => {
		expect(to_hiragana('')).toEqual('')
	})

	test('should convert manual cases', () => {
		// spell-checker: disable

		const check = (input: string, expected: string) => {
			const pre = `${input} = `
			expect(pre + to_hiragana(input)).toEqual(pre + expected)
		}

		check('quaqqua', 'くぁっくぁ')

		// Check the 'nn' handling
		check('n', 'ん')
		check("n'", 'ん')
		check('nn', 'ん') // at the end of input we get the IME handling
		check('nnX', 'んんX') // otherwise normal mapping
		check("n'n", 'んん')

		check('shinnyuu', 'しんにゅう')

		// spell-checker: enable
	})

	test('should convert from manual romaji cases', () => {
		// spell-checker: disable

		const check = (kana: string, romaji: string) => {
			const pre = `${romaji} = `
			expect(pre + to_hiragana(romaji)).toEqual(pre + kana)
		}

		// Hiragana
		check('しゃぎゃつっじゃあんなん　んあんんざ　xzm', `shagyatsujjaan'nan n'an'nza xzm`)

		// Long vogals
		check('あーいーうーえーおー', 'a-i-u-e-o-')
		check('くぁー', 'qua-')

		// Double consonants
		check('ばっば', 'babba')
		check('かっか', 'kakka')
		check('ちゃっちゃ', 'chaccha')
		check('だっだ', 'dadda')
		check('ふっふ', 'fuffu')
		check('がっが', 'gagga')
		check('はっは', 'hahha')
		check('じゃっじゃ', 'jajja')
		check('かっか', 'kakka')
		check('まっま', 'mamma')
		check('なんな', `nan'na`)
		check('なんな', `nanna`)
		check('ぱっぱ', 'pappa')
		check('くぁっくぁ', 'quaqqua')
		check('らっら', 'rarra')
		check('さっさ', 'sassa')
		check('しゃっしゃ', 'shassha')
		check('たった', 'tatta')
		check('つっつ', 'tsuttsu')
		check('ゔぁっゔぁ', 'vavva')
		check('わっわ', 'wawwa')
		check('やっや', 'yayya')
		check('ざっざ', 'zazza')
		check('くぁっくぁ', 'quaqqua')

		check('そうしんうぃんどう', 'soushinWINDOU')
		check('ああんいぇああ', `aan'yeaa`)
		check('ゔぁゔぃゔゔぇゔぉ', 'vavivuvevo')

		check('っっべあ', `bbbea`)

		//
		// Additional kana tests from wana-kana
		//

		check('おなじ', 'onaji')
		check('ぶっつうじ', 'buttsuuji')
		check('わにかに', 'wanikani')
		check('わにかに　あいうえお　鰐蟹　12345　＠＃＄％', 'wanikani aiueo 鰐蟹 12345 @#$%')
		check('座禅「ざぜん」すたいる', '座禅[zazen]sutairu')
		check('ばつげーむ', 'batsuge-mu')

		// Quick Brown Fox Hiragana to Romaji
		check('いろはにほへと', 'irohanihoheto')
		check('ちりぬるを', 'chirinuruwo')
		check('わかよたれそ', 'wakayotareso')
		check('つねならむ', 'tsunenaramu')
		check('ううぃのおくやま', 'uwinookuyama')
		check('けふこえて', 'kefukoete')
		check('あさきゆめみし', 'asakiyumemishi')
		check('うぇひもせすん', 'wehimosesun')

		// Convert katakana to romaji"
		check('わにかに　が　すごい　だ', 'WANIKANI GA SUGOI DA')
		// Convert hiragana to romaji"
		check('わにかに　が　すごい　だ', 'wanikani ga sugoi da')
		// Convert mixed kana to romaji"
		check('わにかに　が　すごい　だ', 'WANIKANI ga sugoi da')
		// Doesn't mangle the long dash 'ー' or slashdot '・'"
		check('罰げーむ・ばつげーむ', '罰GE-MU/batsuge-mu')

		// Double and single n"
		check('きんにくまん', `kin'nikuman`)
		// N extravaganza"
		check('んんにんにんにゃんやん', `n'n'nin'nin'nyan'yan`)
		// Double consonants"
		check('かっぱ　たった　しゅっしゅ　ちゃっちゃ　やっつ', 'kappa tatta shusshu chaccha yattsu')

		// Apostrophes in vague consonant vowel combos:

		check('おんよみ', `on'yomi`)
		check('んよ　んあ　んゆ', `n'yo n'a n'yu`)

		// Small kana:

		// Small tsu
		check('っ', `xtsu`)
		// Small ya
		check('ゃ', 'xya')
		// Small yu
		check('ゅ', 'xyu')
		// Small yo
		check('ょ', 'xyo')
		// Small a
		check('ぁ', 'xa')
		// Small i
		check('ぃ', 'xi')
		// Small u
		check('ぅ', 'xu')
		// Small e
		check('ぇ', 'xe')
		// Small o
		check('ぉ', 'xo')
		// Small ka`
		check('ゕ', 'xKA')
		// Small wa`
		check('ゎ', 'xwa')

		check('ゖ', 'xke')

		// spell-checker: enable
	})

	test('should convert from common katakana', () => {
		const IN =
			'アイウエオ カキクケコ ガギグゲゴ サシスセソ ザジズゼゾ タチツテト ダヂヅデド ナニヌネノ ハヒフヘホ バビブベボ パピプペポ マミムメモ ヤユヨ ラリルレロ ワヰヱヲン'
		const TO =
			'あいうえお　かきくけこ　がぎぐげご　さしすせそ　ざじずぜぞ　たちつてと　だぢづでど　なにぬねの　はひふへほ　ばびぶべぼ　ぱぴぷぺぽ　まみむめも　やゆよ　らりるれろ　わゐゑをん'
		expect(to_hiragana(IN)).toEqual(TO)
	})

	test('should convert from small katakana', () => {
		const IN = 'ァィゥェォッャュョヮヵヶ'
		const TO = 'ぁぃぅぇぉっゃゅょゎゕゖ'
		expect(to_hiragana(IN)).toEqual(TO)
	})

	test('should convert from rare katakana', () => {
		const IN = 'ヴヽヾヿ𛀀ヷヸヹヺ'
		const TO = `ゔゝゞことえわ\u{3099}ゐ\u{3099}ゑ\u{3099}を\u{3099}`
		expect(to_hiragana(IN)).toEqual(TO)
	})

	test('should convert from rare small katakana', () => {
		const IN = 'ㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ'
		const TO = 'くしすとぬはひふへほむらりるれろ'
		expect(to_hiragana(IN)).toEqual(TO)
	})

	test('should support combining marks', () => {
		const B = '\u{3099}' // Combining Katakana-Hiragana Voiced Sound Mark
		const P = '\u{309A}' // Combining Katakana-Hiragana Semi-Voiced Sound Mark
		const IN = `ハ${B}ヒ${B}フ${B}ヘ${B}ホ${B} ハ${P}ヒ${P}フ${P}ヘ${P}ホ${P}`
		const TO = 'ばびぶべぼ　ぱぴぷぺぽ'
		expect(to_hiragana(IN)).toEqual(TO)
	})

	test('should convert from katakana', () => {
		const check = (katakana: string, expected: string) => {
			const pre = `${katakana} = `
			expect(pre + to_hiragana(katakana)).toEqual(pre + expected)
		}

		for (const it of testkana.BASIC_KANA) {
			if (it.hiragana_only) {
				continue
			}
			const expected = it.h
			const katakana = it.k
			check(katakana, expected)
		}
	})

	test('should convert from romaji', () => {
		const check = (romaji: string, expected: string) => {
			const pre = `${romaji} = `
			expect(pre + to_hiragana(romaji)).toEqual(pre + expected)
		}

		for (const it of testkana.BASIC_KANA) {
			const expected = it.h
			for (const romaji of testkana.romaji_inputs(it)) {
				check(romaji, expected)
				check(romaji.toLowerCase(), expected)
				check(romaji.toUpperCase(), expected)
			}
		}
	})

	test('should convert romaji double consonants', () => {
		const check = (romaji: string, expected: string) => {
			const pre = `${romaji} = `
			expect(pre + to_hiragana(romaji)).toEqual(pre + expected)
		}

		for (const it of testkana.DOUBLE_CONSONANTS) {
			const expected = it.h
			for (const romaji of testkana.romaji_inputs(it)) {
				check(romaji, expected)
				check(romaji.toLowerCase(), expected)
				check(romaji.toUpperCase(), expected)
			}
		}
	})

	test('should convert romaji long vowels', () => {
		const check = (romaji: string, expected: string) => {
			const pre = `${romaji} = `
			expect(pre + to_hiragana(romaji)).toEqual(pre + expected)
		}

		for (const it of testkana.LONG_VOWELS) {
			const expected = it.h
			for (const romaji of testkana.romaji_inputs(it)) {
				check(romaji, expected)
				check(romaji.toLowerCase(), expected)
				check(romaji.toUpperCase(), expected)
			}
		}
	})

	test('should convert long double vowel sequences', () => {
		// spell-checker: disable
		expect(to_hiragana('akkkkkkkkkkka')).toEqual('あっっっっっっっっっっか')
		expect(to_hiragana('akkkkkkkkkka')).toEqual('あっっっっっっっっっか')
		expect(to_hiragana('akkkkkkkkka')).toEqual('あっっっっっっっっか')
		expect(to_hiragana('akkkkkkkka')).toEqual('あっっっっっっっか')
		expect(to_hiragana('akkkkkkka')).toEqual('あっっっっっっか')
		expect(to_hiragana('akkkkkka')).toEqual('あっっっっっか')
		expect(to_hiragana('akkkkka')).toEqual('あっっっっか')
		expect(to_hiragana('akkkka')).toEqual('あっっっか')
		expect(to_hiragana('akkka')).toEqual('あっっか')
		expect(to_hiragana('akka')).toEqual('あっか')
		// spell-checker: enable
	})

	// Reverse from the romaji tests.
	test('should convert from ambiguous romaji', () => {
		// spell-checker: disable

		// nn sequences
		expect(to_hiragana(`n'na`)).toEqual('んな')
		expect(to_hiragana(`N'NA`)).toEqual('んな')

		// ny sequences
		expect(to_hiragana(`n'ya`)).toEqual('んや')
		expect(to_hiragana(`N'YA`)).toEqual('んや')

		// n + vowel sequences
		expect(to_hiragana(`n'a`)).toEqual('んあ')
		expect(to_hiragana(`n'e`)).toEqual('んえ')
		expect(to_hiragana(`n'i`)).toEqual('んい')
		expect(to_hiragana(`n'o`)).toEqual('んお')
		expect(to_hiragana(`n'u`)).toEqual('んう')

		expect(to_hiragana(`N'A`)).toEqual('んあ')
		expect(to_hiragana(`N'E`)).toEqual('んえ')
		expect(to_hiragana(`N'I`)).toEqual('んい')
		expect(to_hiragana(`N'O`)).toEqual('んお')
		expect(to_hiragana(`N'U`)).toEqual('んう')

		// spell-checker: enable
	})
})

describe('to_hiragana_key', () => {
	const check = (input: string, expected: string) => {
		const pre = `${input} = `
		expect(pre + to_hiragana_key(input)).toEqual(pre + expected)
	}

	test('should convert to hiragana', () => {
		check('koto', 'こと')
		check('KOTO', 'こと')
		check('コト', 'こと')
	})

	test('should strip sound marks', () => {
		check('かが', 'かか')
		check('きぎ', 'きき')
		check('くぐ', 'くく')
		check('けげ', 'けけ')
		check('こご', 'ここ')
		check('さざ', 'ささ')
		check('しじ', 'しし')
		check('すず', 'すす')
		check('せぜ', 'せせ')
		check('そぞ', 'そそ')
		check('ただ', 'たた')
		check('ちぢ', 'ちち')
		check('つづ', 'つつ')
		check('てで', 'てて')
		check('とど', 'とと')
		check('はばぱ', 'ははは')
		check('ひびぴ', 'ひひひ')
		check('ふぶぷ', 'ふふふ')
		check('へべぺ', 'へへへ')
		check('ほぼぽ', 'ほほほ')
		check('ヴヴ', 'うう')
	})

	test('should convert fullwidth to ASCII', () => {
		check('ＡＢＣ１２３', 'abc123')
	})

	test('should strip non-word', () => {
		check('㊉（漢字）　〖Ａ／Ｂ・Ｃ〗、１ー２～３(;-;) かか 123', '漢字abc123かか123')
	})

	test('should handle small chars', () => {
		check('ゃゅょかった:ぁぃぅぇぉ', 'やゆよかたあいうえお')
	})

	test('should strip つ where っ is possible', () => {
		// We don't want to strip in those cases
		check('つく', 'つく')
		check('つづく', 'つつく')
		check('つつく', 'つつく')
		check('づつく', 'つつく')
		check('！つつ', 'つつ')
		check('あつあ', 'あつあ')
		check('いつい', 'いつい')
		check('うつう', 'うつ') // this is actually a long vowel pair
		check('えつえ', 'えつえ')
		check('おつお', 'おつお')
		check('かたつー', 'かたつ')

		// We want to strip in those
		check('かつた', 'かた')
		check('かたつ', 'かた')
		check('かたつ！', 'かた')

		// Check all possible combinations
		const consonants =
			'かきくけこさしすせそたちてとなにぬねのはひふへほらりるれろ' +
			'がぎくげござじずぜぞだぢでどばびぶべぼぱぴぷぺぽ'
		for (const chr of consonants) {
			const res = chr.normalize('NFD').replace(/[\u3099\u309A]/g, '')
			check('つ' + chr, 'つ' + res)
			check(chr + 'つ', res)
			check(chr + 'つ' + chr, res + res)
		}
	})

	test('should normalize long vowels', () => {
		// Make sure we don't strip different vowel sequences
		check('あいうえお', 'あいうえお')
		check('うお', 'うお')
		check('いえ', 'いえ')

		// First check some tricky corner cases
		check('ぎゃああああ', 'きや')
		check('あーあーあーあ', 'あ')
		check('あーあーあーあー', 'あ')
		check('ヴぅぅぅぅう', 'う')
		check('ヴぉぉぉぉお', 'うお')
		check('せぇ', 'せ')
		check('ぜぇ', 'せ')
		check('ぇえ', 'え')
		check('ええええええい', 'え')
		check('つううううう', 'つ')

		// Check all possible combinations of syllables with their vowels.
		const A = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ']
		const I = ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', 'い', 'り', 'い']
		const U = ['う', 'く', 'す', 'つ', 'ぬ', 'ふ', 'む', 'ゆ', 'る', 'う']
		const E = ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', 'え', 'れ', 'え']
		const O = ['お', 'こ', 'そ', 'と', 'の', 'ほ', 'も', 'よ', 'ろ', 'お']

		const check_col = (ls: string[], vowel: string, small: string) => {
			ls.forEach((pre) => {
				check(pre + vowel, pre)
				check(pre + vowel.repeat(1), pre)
				check(pre + vowel.repeat(2), pre)

				check(pre + small, pre)
				check(pre + small.repeat(1), pre)
				check(pre + small.repeat(2), pre)

				check(pre + vowel + small, pre)
				check(pre + vowel + small.repeat(1), pre)
				check(pre + vowel + small.repeat(2), pre)

				check(pre + vowel.repeat(2) + small, pre)
				check(pre + vowel.repeat(2) + small.repeat(1), pre)
				check(pre + vowel.repeat(2) + small.repeat(2), pre)

				check(pre + small + vowel, pre)
				check(pre + small + vowel.repeat(1), pre)
				check(pre + small + vowel.repeat(2), pre)

				check(pre + small.repeat(2) + vowel, pre)
				check(pre + small.repeat(2) + vowel.repeat(1), pre)
				check(pre + small.repeat(2) + vowel.repeat(2), pre)
			})
		}

		check_col(A, 'あ', 'ぁ')
		check_col(I, 'い', 'ぃ')
		check_col(U, 'う', 'ぅ')
		check_col(E, 'え', 'ぇ')
		check_col(O, 'お', 'ぉ')

		check_col(E, 'い', 'ぃ')
		check_col(O, 'う', 'ぅ')
	})
})
