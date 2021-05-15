import { describe, expect, extendExpect, test } from '../testutil'

import * as chars from './chars'
import { CharFlags, CharKind } from './chars'
import * as util from './util'

describe('chars', () => {
	const expect = customizeExpect()

	describe('chars.next_char', () => {
		test('should return first character in a string', () => {
			expect(chars.next_char('abc')).toEqual('a')
		})

		test('should return empty for empty string', () => {
			expect(chars.next_char('')).toEqual('')
		})

		test('should support UTF-16 surrogate pairs', () => {
			expect(chars.next_char('\u{24B62}!')).toEqual('𤭢')
			expect(chars.next_char('𤭢!')).toEqual('𤭢')

			expect(chars.next_char('\u{1F600}!')).toEqual('😀')
			expect(chars.next_char('😀!')).toEqual('😀')
		})

		test('should handle line breaks', () => {
			expect(chars.next_char('\r\r')).toEqual('\r')
			expect(chars.next_char('\n\n')).toEqual('\n')
			expect(chars.next_char('\r\n')).toEqual('\r')
		})

		test('should handle combining marks', () => {
			expect(chars.next_char('c\u{0327}').normalize()).toEqual('ç')
			expect(chars.next_char('c\u{0327}\u{0304}').normalize()).toEqual('ç̄'.normalize())

			expect(chars.next_char('は\u{3099}').normalize()).toEqual('ば')
			expect(chars.next_char('は\u{309A}').normalize()).toEqual('ぱ')
			expect(chars.next_char('ゝ\u{3099}').normalize()).toEqual('ゞ')
			expect(chars.next_char('ヽ\u{3099}').normalize()).toEqual('ヾ')

			expect(chars.next_char('ワ\u{3099}').normalize()).toEqual('ヷ')
			expect(chars.next_char('ヰ\u{3099}').normalize()).toEqual('ヸ')
			expect(chars.next_char('ヱ\u{3099}').normalize()).toEqual('ヹ')
			expect(chars.next_char('ヲ\u{3099}').normalize()).toEqual('ヺ')

			expect(chars.next_char('わ\u{3099}')).toEqual('わ゙')
			expect(chars.next_char('ゐ\u{3099}')).toEqual('ゐ゙')
			expect(chars.next_char('ゑ\u{3099}')).toEqual('ゑ゙')
			expect(chars.next_char('を\u{3099}')).toEqual('を゙')
		})

		test('should always return a string prefix', () => {
			const check = (input: string) => {
				const output = chars.next_char(input)
				expect(output).toBeTruthy()
				expect(output.length).toBeLessThanOrEqual(input.length)
				expect(output).toStrictEqual(input.slice(0, output.length))
			}
			check('a')
			check('abc')
			check('\u{24B62}!')
			check('𤭢!')
			check('\u{1F600}!')
			check('😀')
			check('😀!')
			check('c\u{0327}')
			check('c\u{0327}\u{0304}')
			check('は\u{3099}')
			check('は\u{309A}')
			check('ゝ\u{3099}')
			check('ヽ\u{3099}')
			check('ワ\u{3099}')
			check('ヰ\u{3099}')
			check('ヱ\u{3099}')
			check('ヲ\u{3099}')
			check('わ\u{3099}')
			check('ゐ\u{3099}')
			check('ゑ\u{3099}')
			check('を\u{3099}')
		})
	})

	describe('chars.remove_accents', () => {
		test('should strip combining diacritics from A-Z characters', () => {
			// Test text, courtesy of https://onlineunicodetools.com/add-combining-characters
			//
			// (space for rendering)
			const WEIRD = ['c̥͛ḁ͛r̥͛p̥͛e̥͛ d̥͛i̥͛e̥͛m̥͛', 'l̡̟̖̟᷿̣̖̮͊̎᷄̈̉̍ͯ︡͜ơ͖̺͖͖̭̘̝̟̈̿ͫ͌̏͘͟͠v̧̨̡̦᷿᷂̣͕̐᷇ͣ︠᷇̏͜͝͡ȅ̫͉̺̖̙͕̯͒̃᷆ͨ᷅͘͢ͅ', 's̶t̶r̶o̶k̶e̶d̶ t̶e̶x̶t̶']

			expect(chars.remove_accents(WEIRD[0])).toEqual('carpe diem')
			expect(chars.remove_accents(WEIRD[1])).toEqual('love')
			expect(chars.remove_accents(WEIRD[2])).toEqual('stroked text')
		})

		test('should preserve romaji long vowels', () => {
			const INPUT_A = 'āīūēō'.normalize('NFD')
			const INPUT_B = 'ĀĪŪĒŌ'.normalize('NFD')
			const INPUT_C = 'āb̄c̄d̄ēf̄ḡh̄īj̄k̄l̄m̄n̄ōp̄q̄r̄s̄t̄ūv̄w̄x̄ȳz̄'.normalize('NFD')
			const INPUT_D = 'ĀB̄C̄D̄ĒF̄ḠH̄ĪJ̄K̄L̄M̄N̄ŌP̄Q̄R̄S̄T̄ŪV̄W̄X̄ȲZ̄'.normalize('NFD')

			const OUTPUT_A = 'āīūēō'.normalize('NFC')
			const OUTPUT_B = 'ĀĪŪĒŌ'.normalize('NFC')
			const OUTPUT_C = 'ābcdēfghījklmnōpqrstūvwxyz'.normalize('NFC')
			const OUTPUT_D = 'ĀBCDĒFGHĪJKLMNŌPQRSTŪVWXYZ'.normalize('NFC')

			expect(chars.remove_accents(INPUT_A)).toEqual(OUTPUT_A)
			expect(chars.remove_accents(INPUT_A, true)).toEqual(OUTPUT_A)
			expect(chars.remove_accents(INPUT_A, false)).toEqual(OUTPUT_A)

			expect(chars.remove_accents(INPUT_B)).toEqual(OUTPUT_B)
			expect(chars.remove_accents(INPUT_B, true)).toEqual(OUTPUT_B)
			expect(chars.remove_accents(INPUT_B, false)).toEqual(OUTPUT_B)

			expect(chars.remove_accents(INPUT_C)).toEqual(OUTPUT_C)
			expect(chars.remove_accents(INPUT_C, true)).toEqual(OUTPUT_C)
			expect(chars.remove_accents(INPUT_C, false)).toEqual(OUTPUT_C)

			expect(chars.remove_accents(INPUT_D)).toEqual(OUTPUT_D)
			expect(chars.remove_accents(INPUT_D, true)).toEqual(OUTPUT_D)
			expect(chars.remove_accents(INPUT_D, false)).toEqual(OUTPUT_D)
		})

		test('should remove invalid voiced sound marks', () => {
			const baseInput = '_(a_ あ_ _ は_ [_])_'

			const inputA = baseInput.replace(/_/g, '\u{3099}')
			const inputB = baseInput.replace(/_/g, '\u{309A}')
			const inputC = baseInput.replace(/_/g, '\u{3099}\u{309A}\u{309A}')
			const outputA = '(a あ  ば [])'.normalize('NFC')
			const outputB = '(a あ  ぱ [])'.normalize('NFC')
			const outputC = outputA

			expect(chars.remove_accents(inputA)).toEqual(outputA)
			expect(chars.remove_accents(inputA, true)).toEqual(outputA)
			expect(chars.remove_accents(inputA, false)).toEqual(outputA)

			expect(chars.remove_accents(inputB)).toEqual(outputB)
			expect(chars.remove_accents(inputB, true)).toEqual(outputB)
			expect(chars.remove_accents(inputB, false)).toEqual(outputB)

			expect(chars.remove_accents(inputC)).toEqual(outputC)
			expect(chars.remove_accents(inputC, true)).toEqual(outputC)
			expect(chars.remove_accents(inputC, false)).toEqual(outputC)
		})

		test('should preserve valid voiced sound marks', () => {
			const H1 =
				'あ゙い゙ゔえ゙お゙がぎぐげござじずぜぞだぢづでどな゙に゙ぬ゙ね゙の゙ばびぶべぼま゙み゙む゙め゙も゙や゙ゆ゙よ゙ら゙り゙る゙れ゙ろ゙わ゙ゐ゙ゑ゙を゙ん゙ゞ'
			const H2 =
				'あ゚い゚う゚え゚お゚か゚き゚く゚け゚こ゚さ゚し゚す゚せ゚そ゚た゚ち゚つ゚て゚と゚な゚に゚ぬ゚ね゚の゚ぱぴぷぺぽま゚み゚む゚め゚も゚や゚ゆ゚よ゚ら゚り゚る゚れ゚ろ゚わ゚ゐ゚ゑ゚を゚ん゚ゝ゚'
			const K1 =
				'ア゙イ゙ヴエ゙オ゙ガギグゲゴザジズゼゾダヂヅデドナ゙ニ゙ヌ゙ネ゙ノ゙バビブベボマ゙ミ゙ム゙メ゙モ゙ヤ゙ユ゙ヨ゙ラ゙リ゙ル゙レ゙ロ゙ヮ゙ヷヸヹヺン゙ヾ'
			const K2 =
				'ア゚イ゚ウ゚エ゚オ゚カ゚キ゚ク゚ケ゚コ゚サ゚シ゚ス゚セ゚ソ゚タ゚チ゚ツ゚テ゚ト゚ナ゚ニ゚ヌ゚ネ゚ノ゚パピプペポマ゚ミ゚ム゚メ゚モ゚ヤ゚ユ゚ヨ゚ラ゚リ゚ル゚レ゚ロ゚ヮ゚ワ゚ヰ゚ヱ゚ヲ゚ン゚ヽ゚'
			const K3 =
				'ｦ゙ｧ゙ｨ゙ｩ゙ｪ゙ｫ゙ｬ゙ｭ゙ｮ゙ｯ゙ｱ゙ｲ゙ｳ゙ｴ゙ｵ゙ｶ゙ｷ゙ｸ゙ｹ゙ｺ゙ｻ゙ｼ゙ｽ゙ｾ゙ｿ゙ﾀ゙ﾁ゙ﾂ゙ﾃ゙ﾄ゙ﾅ゙ﾆ゙ﾇ゙ﾈ゙ﾉ゙ﾊ゙ﾋ゙ﾌ゙ﾍ゙ﾎ゙ﾏ゙ﾐ゙ﾑ゙ﾒ゙ﾓ゙ﾔ゙ﾕ゙ﾖ゙ﾗ゙ﾘ゙ﾙ゙ﾚ゙ﾛ゙ﾜ゙ﾝ゙'
			const K4 =
				'ｦ゚ｧ゚ｨ゚ｩ゚ｪ゚ｫ゚ｬ゚ｭ゚ｮ゚ｯ゚ｱ゚ｲ゚ｳ゚ｴ゚ｵ゚ｶ゚ｷ゚ｸ゚ｹ゚ｺ゚ｻ゚ｼ゚ｽ゚ｾ゚ｿ゚ﾀ゚ﾁ゚ﾂ゚ﾃ゚ﾄ゚ﾅ゚ﾆ゚ﾇ゚ﾈ゚ﾉ゚ﾊ゚ﾋ゚ﾌ゚ﾍ゚ﾎ゚ﾏ゚ﾐ゚ﾑ゚ﾒ゚ﾓ゚ﾔ゚ﾕ゚ﾖ゚ﾗ゚ﾘ゚ﾙ゚ﾚ゚ﾛ゚ﾜ゚ﾝ゚'
			const K5 =
				'ヵ゙ヶ゙ヷ゙ヸ゙ヹ゙ヺ゙ヿ゙𛀀゙ㇰ゙ㇱ゙ㇲ゙ㇳ゙ㇴ゙ㇵ゙ㇶ゙ㇷ゙ㇸ゙ㇹ゙ㇺ゙ㇻ゙ㇼ゙ㇽ゙ㇾ゙ㇿ゙'
			const K6 =
				'ヵ゚ヶ゚ヷ゚ヸ゚ヹ゚ヺ゚ヿ゚𛀀゚ㇰ゚ㇱ゚ㇲ゚ㇳ゚ㇴ゚ㇵ゚ㇶ゚ㇷ゚ㇸ゚ㇹ゚ㇺ゚ㇻ゚ㇼ゚ㇽ゚ㇾ゚ㇿ゚'

			const HA =
				'あいゔえおがぎぐげござじずぜぞだぢづでどなにぬねのばびぶべぼまみむめもやゆよらりるれろわ゙ゐ゙ゑ゙を゙んゞ'

			const HB =
				'あいうえおかきくけこさしすせそたちつてとなにぬねのぱぴぷぺぽまみむめもやゆよらりるれろわゐゑをんゝ'

			const KA =
				'アイヴエオガギグゲゴザジズゼゾダヂヅデドナニヌネノバビブベボマミムメモヤユヨラリルレロヮヷヸヹヺンヾ'

			const KB =
				'アイウエオカキクケコサシスセソタチツテトナニヌネノパピプペポマミムメモヤユヨラリルレロヮワヰヱヲンヽ'

			const KC =
				'ｦｧｨｩｪｫｬｭｮｯｱｲｳ゙ｴｵｶ゙ｷ゙ｸ゙ｹ゙ｺ゙ｻ゙ｼ゙ｽ゙ｾ゙ｿ゙ﾀ゙ﾁ゙ﾂ゙ﾃ゙ﾄ゙ﾅﾆﾇﾈﾉﾊ゙ﾋ゙ﾌ゙ﾍ゙ﾎ゙ﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ゙ﾝ'
			const KD = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊ゚ﾋ゚ﾌ゚ﾍ゚ﾎ゚ﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'
			const KE = 'ヵヶヷヸヹヺヿ𛀀ㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ'
			const KF = 'ヵヶヷヸヹヺヿ𛀀ㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ'

			const TESTS = [
				{ a: H1, b: HA },
				{ a: H2, b: HB },
				{ a: K1, b: KA },
				{ a: K2, b: KB },
				{ a: K3, b: KC },
				{ a: K4, b: KD },
				{ a: K5, b: KE },
				{ a: K6, b: KF },
			]

			for (const it of TESTS) {
				const input = it.a.normalize('NFD')
				const output = it.b.normalize('NFC')
				expect(chars.remove_accents(input)).toEqual(output)
				expect(chars.remove_accents(input, true)).toEqual(output)
				expect(chars.remove_accents(input, false)).toEqual(output)
			}
		})

		test('should strip diacritics if stripAnyLanguage is true', () => {
			const input = '𝘤̥͛𝘢̥͛𝘳̥͛𝘱̥͛𝘦̥͛ 𝘥̥͛𝘪̥͛𝘦̥͛𝘮̥͛'.normalize('NFD')
			const output = '𝘤𝘢𝘳𝘱𝘦 𝘥𝘪𝘦𝘮'.normalize('NFC')
			expect(chars.remove_accents(input)).toEqual(input.normalize('NFC'))
			expect(chars.remove_accents(input, false)).toEqual(input.normalize('NFC'))
			expect(chars.remove_accents(input, true)).toEqual(output)
		})
	})

	describe('chars.get_char_info', () => {
		test('should return undefined for empty', () => {
			expect(chars.get_char_info('')).toBeUndefined()
			expect(chars.get_char_info((null as unknown) as string)).toBeUndefined()
			expect(chars.get_char_info((undefined as unknown) as string)).toBeUndefined()
		})

		test('should support hiragana', () => {
			// Common hiragana
			expect(
				'あいうえおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゆよらりるれろわゐゑをん',
			).eachToHaveCharInfo(CharKind.HIRAGANA, CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER)

			// Common small hiragana
			expect('ぁぃぅぇぉっゃゅょ').eachToHaveCharInfo(
				CharKind.HIRAGANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_SMALL,
			)

			// Rare small hiragana
			expect('ゎゕゖ').eachToHaveCharInfo(
				CharKind.HIRAGANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE | CharFlags.IS_SMALL,
			)

			// Rare hiragana letters
			expect('ゔゟ').eachToHaveCharInfo(
				CharKind.HIRAGANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE,
			)

			// Hiragana iteration marks
			expect('ゝゞ').eachToHaveCharInfo(
				CharKind.HIRAGANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_MARK | CharFlags.IS_RARE,
			)
		})

		test('should support katakana', () => {
			// Common katakana
			expect(
				'アイウエオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロヮワヰヱヲンヴ',
			).eachToHaveCharInfo(CharKind.KATAKANA, CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER)

			// Common small katakana
			expect('ァィゥェォッャュョ').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_SMALL,
			)

			// Halfwidth katakana
			expect('ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_HALFWIDTH,
			)

			// Rare small katakana
			expect('ヵヶ').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE | CharFlags.IS_SMALL,
			)

			// Rare small katakana (phonetic extensions for Ainu)
			expect('ㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE | CharFlags.IS_SMALL,
			)

			// Rare katakana
			expect('ヷヸヹヺヿ𛀀').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE,
			)

			// Katakana iteration marks
			expect('ヽヾ').eachToHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_RARE | CharFlags.IS_MARK,
			)
		})

		test('should support prolonged sound mark', () => {
			expect('ー').eachToHaveCharInfo(CharKind.KANA, CharFlags.CHAR_JAPANESE | CharFlags.IS_LONG_MARK)
			expect('ｰ').eachToHaveCharInfo(
				CharKind.KANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LONG_MARK | CharFlags.IS_HALFWIDTH,
			)
		})

		test('should support weird kana characters', () => {
			// Hiragana Yori
			expect('ゟ').toHaveCharInfo(
				CharKind.HIRAGANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE,
			)
			// Katakana Koto
			expect('ヿ').toHaveCharInfo(
				CharKind.KATAKANA,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_RARE,
			)
			// Masu mark
			expect('〼').toHaveCharInfo(CharKind.KANA, CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER)
		})

		test('should support ASCII fullwidth characters', () => {
			// Fullwidth ASCII digits
			expect('０１２３４５６７８９').eachToHaveCharInfo(
				CharKind.ROMAN_DIGIT,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_ASCII_FULLWIDTH | CharFlags.IS_NUMBER,
			)

			// Fullwidth ASCII uppercase letters
			expect('ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ').eachToHaveCharInfo(
				CharKind.ROMAN_LETTER,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_ASCII_FULLWIDTH | CharFlags.IS_UPPER,
			)

			// Fullwidth ASCII lowercase letters
			expect('ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ').eachToHaveCharInfo(
				CharKind.ROMAN_LETTER,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER | CharFlags.IS_ASCII_FULLWIDTH | CharFlags.IS_LOWER,
			)

			// Fullwidth ASCII punctuation
			expect('！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～').eachToHaveCharInfo(
				CharKind.JAPANESE_PUNCTUATION,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_ASCII_FULLWIDTH,
			)
		})

		test('should support Japanese punctuation', () => {
			// Japanese punctuation
			expect('・゠、。〈〉《》「」『』【】〔〕〖〗〘〙〚〛〜〝〞〟｟｠').eachToHaveCharInfo(
				CharKind.JAPANESE_PUNCTUATION,
				CharFlags.CHAR_JAPANESE,
			)

			// Japanese punctuation (halfwidth)
			expect('｡｢｣､･￨￩￪￫￬￭￮').eachToHaveCharInfo(
				CharKind.JAPANESE_PUNCTUATION,
				CharFlags.CHAR_JAPANESE | CharFlags.IS_HALFWIDTH,
			)
		})

		test('should support Japanese symbols', () => {
			const lines = [
				'゛゜〃〄々〆〒〓〠〰〱〲〳〴〵〶〷〻〽〾〿￠￡￢￣￤￥￦',
				'㈪㈫㈬㈭㈮㈯㈰㈱㈲㈳㈴㈵㈶㈷㈸㈹㈺㈻㈼㈽㈾㈿㉀㉁㉂㉃',
				'㉄㉅㉆㉇㉐㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴',
				'㉵㉶㉷㉸㉹㉺㉻㉼㉽㉾㉿㊊㊋㊌㊍㊎㊏㊐㊑㊒㊓㊔㊕㊖㊗㊘㊙㊚㊛㊜㊝㊞㊟㊠㊡㊢㊣㊤㊥',
				'㊦㊧㊨㊩㊪㊫㊬㊭㊮㊯㊰㋀㋁㋂㋃㋄㋅㋆㋇㋈㋉㋊㋋㋌㋍㋎㋏㋐㋑㋒㋓㋔㋕㋖',
				'㋗㋘㋙㋚㋛㋜㋝㋞㋟㋠㋡㋢㋣㋤㋥㋦㋧㋨㋩㋪㋫㋬㋭㋮㋯㋰㋱㋲㋳㋴㋵㋶㋷㋸㋹㋺㋻㋼㋽㋾',
				'㌀㌁㌂㌃㌄㌅㌆㌇㌈㌉㌊㌋㌌㌍㌎㌏㌐㌑㌒㌓㌔㌕㌖㌗㌘㌙㌚㌛㌜㌝㌞㌟㌠㌡㌢㌣㌤㌥㌦㌧㌨㌩㌪㌫㌬㌭㌮㌯',
				'㌰㌱㌲㌳㌴㌵㌶㌷㌸㌹㌺㌻㌼㌽㌾㌿㍀㍁㍂㍃㍄㍅㍆㍇㍈㍉㍊㍋㍌㍍㍎㍏㍐㍑㍒㍓㍔㍕㍖㍗',
				'㍘㍙㍚㍛㍜㍝㍞㍟㍠㍡㍢㍣㍤㍥㍦㍧㍨㍩㍪㍫㍬㍭㍮㍯㍰㍱㍲㍳㍴㍵㍶㍷㍸㍹㍺㍻㍼㍽㍾㍿',
				'㎀㎁㎂㎃㎄㎅㎆㎇㎈㎉㎊㎋㎌㎍㎎㎏㎐㎑㎒㎓㎔㎕㎖㎗㎘㎙㎚㎛㎜㎝㎞㎟㎠㎡㎢㎣㎤㎥㎦㎧㎨㎩㎪㎫㎬㎭㎮㎯',
				'㎰㎱㎲㎳㎴㎵㎶㎷㎸㎹㎺㎻㎼㎽㎾㎿㏀㏁㏂㏃㏄㏅㏆㏇㏈㏉㏊㏋㏌㏍㏎㏏㏐㏑㏒㏓㏔㏕㏖㏗㏘㏙㏚㏛㏜㏝㏞㏟',
				'㏠㏡㏢㏣㏤㏥㏦㏧㏨㏩㏪㏫㏬㏭㏮㏯㏰㏱㏲㏳㏴㏵㏶㏷㏸㏹㏺㏻㏼㏽㏾㏿',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.JAPANESE_SYMBOL, CharFlags.CHAR_JAPANESE)
			}
		})

		test('should support numeric Japanese symbols', () => {
			const lines = [
				'〇㆒㆓㆔㆕',
				'㈠㈡㈢㈣㈤㈥㈦㈧㈨㈩',
				'㊀㊁㊂㊃㊄㊅㊆㊇㊈㊉',
				'㉈㉉㉊㉋㉌㉍㉎㉏㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.JAPANESE_SYMBOL, CharFlags.CHAR_JAPANESE | CharFlags.IS_NUMBER)
			}
		})

		test('should support kanji', () => {
			const lines = [
				// From all renderable ranges
				'一鿕㐀䶵𠀀𪛖𪜀𫜴𫝀𫠝',
				// Common and Uncommon Kanji (4E00 - 9FAF)
				'一丁丂七丄丅丆万丈三上下丌不与丏丐丑丒专且丕世丗丘丙',
				'鿀鿁鿂鿃鿄鿅鿆鿇鿈鿉鿊鿋鿌鿍鿎鿏鿐鿑鿒鿓鿔',
				// CJK unified ideographs Extension A - Rare kanji (3400 - 4DBF)
				'㐀㐁㐂㐃㐄㐅㐆㐇㐈㐉㐊㐋㐌㐍㐎㐏㐐㐑㐒㐓㐔㐕㐖㐗㐘㐙㐚㐛㐜㐝㐞㐟㐠',
				'䶣䶤䶥䶦䶧䶨䶩䶪䶫䶬䶭䶮䶯䶰䶱䶲䶳䶴䶵',
				// CJK Compatibility Ideographs
				'豈更車賈滑串句龜龜契金喇奈懶癩羅',
				'艹著褐視謁謹賓贈辶逸難響頻恵𤋮舘',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.KANJI, CharFlags.CHAR_JAPANESE | CharFlags.IS_LETTER)
			}
		})

		test('should support kanji radicals', () => {
			const lines = [
				'⺀⺁⺂⺃⺄⺅⺆⺇⺈⺉⺊⺋⺌⺍⺎⺏⺐⺑⺒⺓⺔⺕⺖⺗⺘⺙⺛⺜⺝⺞⺟',
				'⺠⺡⺢⺣⺤⺥⺦⺧⺨⺩⺪⺫⺬⺭⺮⺯⺰⺱⺲⺳⺴⺵⺶⺷⺸⺹⺺⺻⺼⺽⺾',
				'⺿⻀⻁⻂⻃⻄⻅⻆⻇⻈⻉⻊⻋⻌⻍⻎⻏⻐⻑⻒⻓⻔⻕⻖⻗⻘⻙⻚⻛⻜⻝',
				'⻞⻟⻠⻡⻢⻣⻤⻥⻦⻧⻨⻩⻪⻫⻬⻭⻮⻯⻰⻱⻲⻳⼀⼁⼂⼃⼄⼅⼆⼇⼈',
				'⼉⼊⼋⼌⼍⼎⼏⼐⼑⼒⼓⼔⼕⼖⼗⼘⼙⼚⼛⼜⼝⼞⼟⼠⼡⼢⼣⼤⼥⼦⼧',
				'⼨⼩⼪⼫⼬⼭⼮⼯⼰⼱⼲⼳⼴⼵⼶⼷⼸⼹⼺⼻⼼⼽⼾⼿⽀⽁⽂⽃⽄⽅⽆',
				'⽇⽈⽉⽊⽋⽌⽍⽎⽏⽐⽑⽒⽓⽔⽕⽖⽗⽘⽙⽚⽛⽜⽝⽞⽟⽠⽡⽢⽣⽤⽥',
				'⽦⽧⽨⽩⽪⽫⽬⽭⽮⽯⽰⽱⽲⽳⽴⽵⽶⽷⽸⽹⽺⽻⽼⽽⽾⽿⾀⾁⾂⾃⾄',
				'⾅⾆⾇⾈⾉⾊⾋⾌⾍⾎⾏⾐⾑⾒⾓⾔⾕⾖⾗⾘⾙⾚⾛⾜⾝⾞⾟⾠⾡⾢⾣',
				'⾤⾥⾦⾧⾨⾩⾪⾫⾬⾭⾮⾯⾰⾱⾲⾳⾴⾵⾶⾷⾸⾹⾺⾻⾼⾽⾾⾿⿀⿁⿂',
				'⿃⿄⿅⿆⿇⿈⿉⿊⿋⿌⿍⿎⿏⿐⿑⿒⿓⿔⿕',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(
					CharKind.JAPANESE_SYMBOL,
					CharFlags.CHAR_JAPANESE | CharFlags.IS_KANJI_RADICAL,
				)
			}
		})

		test('should support all kanji ranges', () => {
			expect('\u{3400}\u{4DBF}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{4E00}\u{9FFF}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{F900}\u{FAFF}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{20000}\u{2A6DF}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{2A700}\u{2B73F}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{2B740}\u{2B81F}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{2B820}\u{2CEAF}').eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{2CEB0}\u{2EBEF}').eachToHaveCharInfo(CharKind.KANJI)

			// Test outside ranges
			expect('\u{33FF}\u{4DC0}').not.eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{4DFF}\u{A000}').not.eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{F8FF}\u{FB00}').not.eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{1FFFF}\u{2A6E0}').not.eachToHaveCharInfo(CharKind.KANJI)
			expect('\u{2A6FF}\u{2EBF0}').not.eachToHaveCharInfo(CharKind.KANJI) // Continuous ranges
		})

		test('should support romaji', () => {
			// A-Z letters
			expect('abcdefghijklmnopqrstuvwxyz').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_LOWER,
			)
			expect('ABCDEFGHIJKLMNOPQRSTUVWXYZ').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_UPPER,
			)

			expect('_').toHaveCharInfo(CharKind.ROMAJI, CharFlags.CHAR_ASCII)

			// ASCII digits
			expect('0123456789').eachToHaveCharInfo(CharKind.ROMAJI, CharFlags.CHAR_ASCII | CharFlags.IS_NUMBER)

			// Extended vowels
			expect('âêîôû').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_LOWER,
			)
			expect('ÂÊÎÔÛ').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_UPPER,
			)
			expect('āēīōū').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_LOWER,
			)
			expect('ĀĒĪŌŪ').eachToHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_UPPER,
			)
			expect(`!"#$%&'()*+,-./:;<=>?@[\\]^\`{|}~`).eachToHaveCharInfo(
				CharKind.ROMAJI_PUNCTUATION,
				CharFlags.CHAR_ASCII,
			)
		})

		test('should support space', () => {
			// ASCII spaces
			expect(' \t\r\n\v').eachToHaveCharInfo(CharKind.SPACE, CharFlags.CHAR_ASCII)

			// Ideographic Space used for Japanese
			expect('\u{3000}').eachToHaveCharInfo(CharKind.SPACE, CharFlags.CHAR_JAPANESE)

			// U+2028 - Line Separator
			// U+2029 - Paragraph Separator
			expect('\u{2028}\u{2029}').eachToHaveCharInfo(CharKind.SPACE, CharFlags.NONE)

			// Space Separator category
			expect(
				'\u{00A0}\u{1680}\u{2000}\u{2001}\u{2002}\u{2003}\u{2004}\u{2005}\u{2006}\u{2007}\u{2008}\u{2009}\u{200A}\u{202F}\u{205F}',
			).eachToHaveCharInfo(CharKind.SPACE, CharFlags.NONE)
		})

		test('should support CharKind.OTHER_WORD for lowercase letters', () => {
			// spell-checker: disable
			const lines = [
				'µßàáãäåæçèéëìíïðñòóõöøùúüýþÿăąćĉċčďđĕėęěĝğġģĥħĩĭįıĳĵķĸĺļľŀłńņňŉŋŏőœŕŗřśŝşšţťŧũŭůűųŵŷźżž',
				'ſƀƃƅƈƌƍƒƕƙƚƛƞơƣƥƨƪƫƭưƴƶƹƺƽƾƿǆǉǌǎǐǒǔǖǘǚǜǝǟǡǣǥǧǩǫǭǯǰǳǵǹǻǽǿȁȃȅȇȉȋȍȏȑȓȕȗșțȝȟȡȣȥȧȩȫȭȯȱȳȴȵȶȷȸȹȼȿɀɂɇɉɋɍɏɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʕʖʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʬʭʮʯ',
				'ͱͳͷͻͼͽΐάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϐϑϕϖϗϙϛϝϟϡϣϥϧϩϫϭϯϰϱϲϳϵϸϻϼ',
				'абвгдежзийклмнопрстуфхцчшщъыьэюяѐёђѓєѕіїјљњћќѝўџѡѣѥѧѩѫѭѯѱѳѵѷѹѻѽѿҁҋҍҏґғҕҗҙқҝҟҡңҥҧҩҫҭүұҳҵҷҹһҽҿӂӄӆӈӊӌӎӏӑӓӕӗәӛӝӟӡӣӥӧөӫӭӯӱӳӵӷӹӻӽӿԁԃԅԇԉԋԍԏԑԓԕԗԙԛԝԟԡԣԥԧԩԫԭԯ',
				'աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆև',
				'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺჽჾჿ',
				'ᏸᏹᏺᏻᏼᏽ',
				'ᴀᴁᴂᴃᴄᴅᴆᴇᴈᴉᴊᴋᴌᴍᴎᴏᴐᴑᴒᴓᴔᴕᴖᴗᴘᴙᴚᴛᴜᴝᴞᴟᴠᴡᴢᴣᴤᴥ',
				'ᴦᴧᴨᴩᴪᴫᵫᵬᵭᵮᵯᵰᵱᵲᵳᵴᵵᵶᵷᵹᵺᵻᵼᵽᵾᵿᶀᶁᶂᶃᶄᶅᶆᶇᶈᶉᶊᶋᶌᶍᶎᶏᶐᶑᶒᶓᶔᶕᶖᶗᶘᶙᶚḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕẖẗẘẙẚẛẜẝẟạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹỻỽỿ',
				'ἀἁἂἃἄἅἆἇἐἑἒἓἔἕἠἡἢἣἤἥἦἧἰἱἲἳἴἵἶἷὀὁὂὃὄὅὐὑὒὓὔὕὖὗὠὡὢὣὤὥὦὧὰάὲέὴήὶίὸόὺύὼώᾀᾁᾂᾃᾄᾅᾆᾇᾐᾑᾒᾓᾔᾕᾖᾗᾠᾡᾢᾣᾤᾥᾦᾧᾰᾱᾲᾳᾴᾶᾷιῂῃῄῆῇῐῑῒΐῖῗῠῡῢΰῤῥῦῧῲῳῴῶῷ',
				'ℊℎℏℓℯℴℹℼℽⅆⅇⅈⅉⅎↄⰰⰱⰲⰳⰴⰵⰶⰷⰸⰹⰺⰻⰼⰽⰾⰿⱀⱁⱂⱃⱄⱅⱆⱇⱈⱉⱊⱋⱌⱍⱎⱏⱐⱑⱒⱓⱔⱕⱖⱗⱘⱙⱚⱛⱜⱝⱞ',
				'ⱡⱥⱦⱨⱪⱬⱱⱳⱴⱶⱷⱸⱹⱺⱻⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱⲳⲵⲷⲹⲻⲽⲿⳁⳃⳅⳇⳉⳋⳍⳏⳑⳓⳕⳗⳙⳛⳝⳟⳡⳣⳤⳬⳮⳳ',
				'ⴀⴁⴂⴃⴄⴅⴆⴇⴈⴉⴊⴋⴌⴍⴎⴏⴐⴑⴒⴓⴔⴕⴖⴗⴘⴙⴚⴛⴜⴝⴞⴟⴠⴡⴢⴣⴤⴥⴧⴭ',
				'ꙁꙃꙅꙇꙉꙋꙍꙏꙑꙓꙕꙗꙙꙛꙝꙟꙡꙣꙥꙧꙩꙫꙭꚁꚃꚅꚇꚉꚋꚍꚏꚑꚓꚕꚗꚙꚛ',
				'ꜣꜥꜧꜩꜫꜭꜯꜰꜱꜳꜵꜷꜹꜻꜽꜿꝁꝃꝅꝇꝉꝋꝍꝏꝑꝓꝕꝗꝙꝛꝝꝟꝡꝣꝥꝧꝩꝫꝭꝯꝱꝲꝳꝴꝵꝶꝷꝸꝺꝼꝿꞁꞃꞅꞇꞌꞎꞑꞓꞔꞕꞗꞙꞛꞝꞟꞡꞣꞥꞧꞩꞵꞷꟺꬰꬱꬲꬳꬴꬵꬶꬷꬸꬹꬺꬻꬼꬽꬾꬿꭀꭁꭂꭃꭄꭅꭆꭇꭈꭉꭊꭋꭌꭍꭎꭏꭐꭑꭒꭓꭔꭕꭖꭗꭘꭙꭚꭠꭡꭢꭣꭤꭥ',
				'ꭰꭱꭲꭳꭴꭵꭶꭷꭸꭹꭺꭻꭼꭽꭾꭿꮀꮁꮂꮃꮄꮅꮆꮇꮈꮉꮊꮋꮌꮍꮎꮏꮐꮑꮒꮓꮔꮕꮖꮗꮘꮙꮚꮛꮜꮝꮞꮟꮠꮡꮢꮣꮤꮥꮦꮧꮨꮩꮪꮫꮬꮭꮮꮯꮰꮱꮲꮳꮴꮵꮶꮷꮸꮹꮺꮻꮼꮽꮾꮿ',
				'ﬀﬁﬂﬃﬄﬅﬆﬓﬔﬕﬖﬗ',
				'𐐨𐐩𐐪𐐫𐐬𐐭𐐮𐐯𐐰𐐱𐐲𐐳𐐴𐐵𐐶𐐷𐐸𐐹𐐺𐐻𐐼𐐽𐐾𐐿𐑀𐑁𐑂𐑃𐑄𐑅𐑆𐑇𐑈𐑉𐑊𐑋𐑌𐑍𐑎𐑏',
				'𐓘𐓙𐓚𐓛𐓜𐓝𐓞𐓟𐓠𐓡𐓢𐓣𐓤𐓥𐓦𐓧𐓨𐓩𐓪𐓫𐓬𐓭𐓮𐓯𐓰𐓱𐓲𐓳𐓴𐓵𐓶𐓷𐓸𐓹𐓺𐓻',
				'𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
				'𝑎𝑏𝑐𝑑𝑒𝑓𝑔𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
				'𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛',
				'𝒶𝒷𝒸𝒹𝒻𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
				'𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
				'𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
				'𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
				'𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
				'𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓',
				'𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
				'𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
				'𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
				'𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
				'𝚤𝚥𝛂𝛃𝛄𝛅𝛆𝛇𝛈𝛉𝛊𝛋𝛌𝛍𝛎𝛏𝛐𝛑𝛒𝛓𝛔𝛕𝛖𝛗𝛘𝛙𝛚𝛜𝛝𝛞𝛟𝛠𝛡',
				'𝛼𝛽𝛾𝛿𝜀𝜁𝜂𝜃𝜄𝜅𝜆𝜇𝜈𝜉𝜊𝜋𝜌𝜍𝜎𝜏𝜐𝜑𝜒𝜓𝜔𝜖𝜗𝜘𝜙𝜚𝜛',
				'𝜶𝜷𝜸𝜹𝜺𝜻𝜼𝜽𝜾𝜿𝝀𝝁𝝂𝝃𝝄𝝅𝝆𝝇𝝈𝝉𝝊𝝋𝝌𝝍𝝎𝝐𝝑𝝒𝝓𝝔𝝕',
				'𝝰𝝱𝝲𝝳𝝴𝝵𝝶𝝷𝝸𝝹𝝺𝝻𝝼𝝽𝝾𝝿𝞀𝞁𝞂𝞃𝞄𝞅𝞆𝞇𝞈𝞊𝞋𝞌𝞍𝞎𝞏',
				'𝞪𝞫𝞬𝞭𝞮𝞯𝞰𝞱𝞲𝞳𝞴𝞵𝞶𝞷𝞸𝞹𝞺𝞻𝞼𝞽𝞾𝞿𝟀𝟁𝟂𝟄𝟅𝟆𝟇𝟈𝟉𝟋',
				'𞤢𞤣𞤤𞤥𞤦𞤧𞤨𞤩𞤪𞤫𞤬𞤭𞤮𞤯𞤰𞤱𞤲𞤳𞤴𞤵𞤶𞤷𞤸𞤹𞤺𞤻𞤼𞤽𞤾𞤿𞥀𞥁𞥂𞥃',
			]
			// spell-checker: enable
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_WORD, CharFlags.IS_LOWER | CharFlags.IS_LETTER)
			}
		})

		test('should support CharKind.OTHER_WORD for uppercase letters', () => {
			// spell-checker: disable
			const lines = [
				'ÀÁÃÄÅÆÇÈÉËÌÍÏÐÑÒÓÕÖØÙÚÜÝÞĂĄĆĈĊČĎĐĔĖĘĚĜĞĠĢĤĦĨĬĮİĲĴĶĹĻĽĿŁŃŅŇŊŎŐŒŔŖŘŚŜŞŠŢŤŦŨŬŮŰŲŴŶŸŹŻŽ',
				'ƁƂƄƆƇƉƊƋƎƏƐƑƓƔƖƗƘƜƝƟƠƢƤƦƧƩƬƮƯƱƲƳƵƷƸƼǄǇǊǍǏǑǓǕǗǙǛǞǠǢǤǦǨǪǬǮǱǴǶǷǸǺǼǾȀȂȄȆȈȊȌȎȐȒȔȖȘȚȜȞȠȢȤȦȨȪȬȮȰȲȺȻȽȾɁɃɄɅɆɈɊɌɎ',
				'ͰͲͶͿΆΈΉΊΌΎΏΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΪΫϏϒϓϔϘϚϜϞϠϢϤϦϨϪϬϮϴϷϹϺϽϾϿ',
				'ЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯѠѢѤѦѨѪѬѮѰѲѴѶѸѺѼѾҀҊҌҎҐҒҔҖҘҚҜҞҠҢҤҦҨҪҬҮҰҲҴҶҸҺҼҾӀӁӃӅӇӉӋӍӐӒӔӖӘӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒԔԖԘԚԜԞԠԢԤԦԨԪԬԮ',
				'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖ',
				'ႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀჁჂჃჄჅჇჍ',
				'ᎠᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎫᎬᎭᎮᎯᎰᎱᎲᎳᎴᎵᎶᎷᎸᎹᎺᎻᎼᎽᎾᎿᏀᏁᏂᏃᏄᏅᏆᏇᏈᏉᏊᏋᏌᏍᏎᏏᏐᏑᏒᏓᏔᏕᏖᏗᏘᏙᏚᏛᏜᏝᏞᏟᏠᏡᏢᏣᏤᏥᏦᏧᏨᏩᏪᏫᏬᏭᏮᏯᏰᏱᏲᏳᏴᏵ',
				'ᲐᲑᲒᲓᲔᲕᲖᲗᲘᲙᲚᲛᲜᲝᲞᲟᲠᲡᲢᲣᲤᲥᲦᲧᲨᲩᲪᲫᲬᲭᲮᲯᲰᲱᲲᲳᲴᲵᲶᲷᲸᲹᲺᲽᲾᲿ',
				'ḀḂḄḆḈḊḌḎḐḒḔḖḘḚḜḞḠḢḤḦḨḪḬḮḰḲḴḶḸḺḼḾṀṂṄṆṈṊṌṎṐṒṔṖṘṚṜṞṠṢṤṦṨṪṬṮṰṲṴṶṸṺṼṾẀẂẄẆẈẊẌẎẐẒẔẞẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸỺỼỾ',
				'ἈἉἊἋἌἍἎἏἘἙἚἛἜἝἨἩἪἫἬἭἮἯἸἹἺἻἼἽἾἿὈὉὊὋὌὍὙὛὝὟὨὩὪὫὬὭὮὯᾸᾹᾺΆῈΈῊΉῘῙῚΊῨῩῪΎῬῸΌῺΏ',
				'ℂℇℋℌℍℐℑℒℕℙℚℛℜℝℤΩℨKÅℬℭℰℱℲℳℾℿⅅↃⰀⰁⰂⰃⰄⰅⰆⰇⰈⰉⰊⰋⰌⰍⰎⰏⰐⰑⰒⰓⰔⰕⰖⰗⰘⰙⰚⰛⰜⰝⰞⰟⰠⰡⰢⰣⰤⰥⰦⰧⰨⰩⰪⰫⰬⰭⰮⱠⱢⱣⱤⱧⱩⱫⱭⱮⱯⱰⱲⱵⱾⱿⲀⲂⲄⲆⲈⲊⲌⲎⲐⲒⲔⲖⲘⲚⲜⲞⲠⲢⲤⲦⲨⲪⲬⲮⲰⲲⲴⲶⲸⲺⲼⲾⳀⳂⳄⳆⳈⳊⳌⳎⳐⳒⳔⳖⳘⳚⳜⳞⳠⳢⳫⳭⳲ',
				'ꙀꙂꙄꙆꙈꙊꙌꙎꙐꙒꙔꙖꙘꙚꙜꙞꙠꙢꙤꙦꙨꙪꙬꚀꚂꚄꚆꚈꚊꚌꚎꚐꚒꚔꚖꚘꚚ',
				'ꜢꜤꜦꜨꜪꜬꜮꜲꜴꜶꜸꜺꜼꜾꝀꝂꝄꝆꝈꝊꝌꝎꝐꝒꝔꝖꝘꝚꝜꝞꝠꝢꝤꝦꝨꝪꝬꝮꝹꝻꝽꝾꞀꞂꞄꞆꞋꞍꞐꞒꞖꞘꞚꞜꞞꞠꞢꞤꞦꞨꞪꞫꞬꞭꞮꞰꞱꞲꞳꞴꞶ',
				'𐐀𐐁𐐂𐐃𐐄𐐅𐐆𐐇𐐈𐐉𐐊𐐋𐐌𐐍𐐎𐐏𐐐𐐑𐐒𐐓𐐔𐐕𐐖𐐗𐐘𐐙𐐚𐐛𐐜𐐝𐐞𐐟𐐠𐐡𐐢𐐣𐐤𐐥𐐦𐐧𐒰𐒱𐒲𐒳𐒴𐒵𐒶𐒷𐒸𐒹𐒺𐒻𐒼𐒽𐒾𐒿𐓀𐓁𐓂𐓃𐓄𐓅𐓆𐓇𐓈𐓉𐓊𐓋𐓌𐓍𐓎𐓏𐓐𐓑𐓒𐓓',
				'𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
				'𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
				'𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁',
				'𝒜𝒞𝒟𝒢𝒥𝒦𝒩𝒪𝒫𝒬𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
				'𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
				'𝔄𝔅𝔇𝔈𝔉𝔊𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔𝔖𝔗𝔘𝔙𝔚𝔛𝔜',
				'𝔸𝔹𝔻𝔼𝔽𝔾𝕀𝕁𝕂𝕃𝕄𝕆𝕊𝕋𝕌𝕍𝕎𝕏𝕐',
				'𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
				'𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹',
				'𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
				'𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
				'𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
				'𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
				'𝚨𝚩𝚪𝚫𝚬𝚭𝚮𝚯𝚰𝚱𝚲𝚳𝚴𝚵𝚶𝚷𝚸𝚹𝚺𝚻𝚼𝚽𝚾𝚿𝛀',
				'𝛢𝛣𝛤𝛥𝛦𝛧𝛨𝛩𝛪𝛫𝛬𝛭𝛮𝛯𝛰𝛱𝛲𝛳𝛴𝛵𝛶𝛷𝛸𝛹𝛺',
				'𝜜𝜝𝜞𝜟𝜠𝜡𝜢𝜣𝜤𝜥𝜦𝜧𝜨𝜩𝜪𝜫𝜬𝜭𝜮𝜯𝜰𝜱𝜲𝜳𝜴',
				'𝝖𝝗𝝘𝝙𝝚𝝛𝝜𝝝𝝞𝝟𝝠𝝡𝝢𝝣𝝤𝝥𝝦𝝧𝝨𝝩𝝪𝝫𝝬𝝭𝝮',
				'𝞐𝞑𝞒𝞓𝞔𝞕𝞖𝞗𝞘𝞙𝞚𝞛𝞜𝞝𝞞𝞟𝞠𝞡𝞢𝞣𝞤𝞥𝞦𝞧𝞨',
				'𝟊𞤀𞤁𞤂𞤃𞤄𞤅𞤆𞤇𞤈𞤉𞤊𞤋𞤌𞤍𞤎𞤏𞤐𞤑𞤒𞤓𞤔𞤕𞤖𞤗𞤘𞤙𞤚𞤛𞤜𞤝𞤞𞤟𞤠𞤡',
			]
			// spell-checker: enable
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_WORD, CharFlags.IS_UPPER | CharFlags.IS_LETTER)
			}
		})

		test('should support CharKind.OTHER_WORD for other letters', () => {
			// spell-checker: disable
			const lines = [
				'ªºƻǀǁǂǃʔ',
				'אבגדהוזחטיךכלםמןנסעףפץצקרשתׯװױײ',
				'ؠءآأؤإئابةتثجحخدذرزسشصضطظعغػؼؽؾؿفقكلمنهوىيٮٯٱٲٳٴٵٶٷٸٹٺٻټٽپٿڀځڂڃڄڅچڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨکڪګڬڭڮگڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿۀہۂۃۄۅۆۇۈۉۊۋیۍێۏېۑےۓەۮۯۺۻۼۿ',
				'ܐܒܓܔܕܖܗܘܙܚܛܜܝܞܟܠܡܢܣܤܥܦܧܨܩܪܫܬܭܮܯݍݎݏݐݑݒݓݔݕݖݗݘݙݚݛݜݝݞݟݠݡݢݣݤݥݦݧݨݩݪݫݬݭݮݯݰݱݲݳݴݵݶݷݸݹݺݻݼݽݾݿ',
				'ހށނރބޅކއވމފދތލގޏސޑޒޓޔޕޖޗޘޙޚޛޜޝޞޟޠޡޢޣޤޥޱ',
				'ߊߋߌߍߎߏߐߑߒߓߔߕߖߗߘߙߚߛߜߝߞߟߠߡߢߣߤߥߦߧߨߩߪ',
				'ࢠࢡࢢࢣࢤࢥࢦࢧࢨࢩࢪࢫࢬࢭࢮࢯࢰࢱࢲࢳࢴࢶࢷࢸࢹࢺࢻࢼࢽ',
				'ऄअआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनऩपफबभमयरऱलळऴवशषसहऽॐक़ख़ग़ज़ड़ढ़फ़य़ॠॡॲॳॴॵॶॷॸॹॺॻॼॽॾॿ',
				'ঀঅআইঈউঊঋঌএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহঽৎড়ঢ়য়ৠৡৰৱৼ',
				'ਅਆਇਈਉਊਏਐਓਔਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਲ਼ਵਸ਼ਸਹਖ਼ਗ਼ਜ਼ੜਫ਼ੲੳੴ',
				'અઆઇઈઉઊઋઌઍએઐઑઓઔકખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલળવશષસહઽૐૠૡૹ',
				'ଅଆଇଈଉଊଋଌଏଐଓଔକଖଗଘଙଚଛଜଝଞଟଠଡଢଣତଥଦଧନପଫବଭମଯରଲଳଵଶଷସହଽଡ଼ଢ଼ୟୠୡୱ',
				'ஃஅஆஇஈஉஊஎஏஐஒஓஔகஙசஜஞடணதநனபமயரறலளழவஶஷஸஹௐ',
				'అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరఱలళఴవశషసహఽౘౙౚౠౡ',
				'അആഇഈഉഊഋഌഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനഩപഫബഭമയരറലളഴവശഷസഹഺഽൎൔൕൖൟൠൡൺൻർൽൾൿ',
				'අආඇඈඉඊඋඌඍඎඏඐඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆ',
				'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮฯะาำเแโใไ',
				'ǅǈǋǲᾈᾉᾊᾋᾌᾍᾎᾏᾘᾙᾚᾛᾜᾝᾞᾟᾨᾩᾪᾫᾬᾭᾮᾯᾼῌῼ',
				'ʰʱʲʳʴʵʶʷʸʹʺʻʼʽʾʿˀˁˆˇˈˉˊˋˌˍˎˏːˑˠˡˢˣˤˬˮ',
				'ʹͺՙـۥۦߴߵߺॱๆໆჼៗᡃᱸᱹᱺᱻᱼᱽ',
				'ᴬᴭᴮᴯᴰᴱᴲᴳᴴᴵᴶᴷᴸᴹᴺᴻᴼᴽᴾᴿᵀᵁᵂ',
				'ᵃᵄᵅᵆᵇᵈᵉᵊᵋᵌᵍᵎᵏᵐᵑᵒᵓᵔᵕᵖᵗᵘᵙᵚᵛᵜᵝᵞᵟᵠᵡ',
				'ᵢᵣᵤᵥᵦᵧᵨᵩᵪ',
				'ᵸᶛᶜᶝᶞᶟᶠᶡᶢᶣᶤᶥᶦᶧᶨᶩᶪᶫᶬᶭᶮᶯᶰᶱᶲᶳᶴᶵᶶᶷᶸᶹᶺᶻᶼᶽᶾᶿⁱⁿ',
				'ₐₑₒₓₔₕₖₗₘₙₚₛₜⱼⱽⵯⸯ',
				'ꀕꓸꓹꓺꓻꓼꓽꘌ',
				'ꙿꚜꚝꜗꜘꜙꜚꜛꜜꜝꜞꜟꝰꞈꟸꟹꧏꧦꩰꭜꭝꭞꭟﾞﾟ𞥋',
			]
			// spell-checker: enable
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_WORD, CharFlags.IS_LETTER)
			}
		})

		test('should support CharKind.OTHER_WORD for other digits', () => {
			const lines = [
				'٠١٢٣٤٥٦٧٨٩',
				'۰۱۲۳۴۵۶۷۸۹',
				'߀߁߂߃߄߅߆߇߈߉',
				'०१२३४५६७८९',
				'০১২৩৪৫৬৭৮৯',
				'੦੧੨੩੪੫੬੭੮੯૦૧૨૩૪૫૬૭૮૯',
				'୦୧୨୩୪୫୬୭୮୯',
				'௦௧௨௩௪௫௬௭௮௯',
				'౦౧౨౩౪౫౬౭౮౯',
				'೦೧೨೩೪೫೬೭೮೯',
				'൦൧൨൩൪൫൬൭൮൯',
				'෦෧෨෩෪෫෬෭෮෯',
				'๐๑๒๓๔๕๖๗๘๙',
				'໐໑໒໓໔໕໖໗໘໙',
				'༠༡༢༣༤༥༦༧༨༩',
				'၀၁၂၃၄၅၆၇၈၉႐႑႒႓႔႕႖႗႘႙',
				'០១២៣៤៥៦៧៨៩',
				'᠐᠑᠒᠓᠔᠕᠖᠗᠘᠙',
				'᧐᧑᧒᧓᧔᧕᧖᧗᧘᧙',
				'᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙',
				'꘠꘡꘢꘣꘤꘥꘦꘧꘨꘩',
				'꧐꧑꧒꧓꧔꧕꧖꧗꧘꧙',
				'꧰꧱꧲꧳꧴꧵꧶꧷꧸꧹',
				'꯰꯱꯲꯳꯴꯵꯶꯷꯸꯹',
				'𐒠𐒡𐒢𐒣𐒤𐒥𐒦𐒧𐒨𐒩',
				'𑁦𑁧𑁨𑁩𑁪𑁫𑁬𑁭𑁮𑁯',
				'𑃰𑃱𑃲𑃳𑃴𑃵𑃶𑃷𑃸𑃹',
				'𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
				'𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
				'𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫',
				'𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
				'𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
				'𞥐𞥑𞥒𞥓𞥔𞥕𞥖𞥗𞥘𞥙',

				// Letter Number category
				'ᛮᛯᛰⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻⅼⅽⅾⅿↀↁↂↅↆↇↈ〡〢〣〤〥〦〧〨〩〸〹〺𐍁𐍊𐏑𐏒𐏓𐏔𐏕',
				'𒐀𒐁𒐂𒐃𒐄𒐅𒐆𒐇𒐈𒐉𒐊𒐋𒐌𒐍𒐎𒐏𒐐𒐑𒐒𒐓𒐔𒐕𒐖𒐗𒐘𒐙𒐚𒐛𒐜𒐝𒐞𒐟𒐠𒐡𒐢',
				'𒐣𒐤𒐥𒐦𒐧𒐨𒐩𒐪𒐫𒐬𒐭𒐮𒐯𒐰𒐱𒐲𒐳𒐴𒐵𒐶𒐷𒐸𒐹',
				'𒐺𒐻𒐼𒐽𒐾𒐿𒑀𒑁𒑂𒑃𒑄𒑅𒑆𒑇𒑈𒑉𒑊𒑋𒑌𒑍𒑎𒑏𒑐𒑑𒑒𒑓𒑔𒑕𒑖𒑗𒑘𒑙𒑚𒑛𒑜𒑝𒑞𒑟𒑠𒑡𒑢𒑣𒑤𒑥𒑦𒑧𒑨𒑩𒑪𒑫𒑬𒑭𒑮',

				// Other Number category
				'²³¹¼½¾৴৵৶৷৸৹୲୳୴୵୶୷௰௱௲౸౹౺౻౼౽౾൰൱൲൳൴൵༪༫༬༭༮༯༰༱༲༳፩፪፫፬፭፮፯፰፱፲፳፴፵፶፷፸፹፺፻፼៰៱៲៳៴៵៶៷៸៹᧚',
				'⁰⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅟↉①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇',
				'⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛⓪⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴⓵⓶⓷⓸⓹⓺⓻⓼⓽⓾⓿❶❷❸❹❺❻❼❽❾❿➀➁➂➃➄➅➆➇➈➉➊➋➌➍➎➏➐➑➒➓⳽꠰꠱꠲꠳꠴꠵',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_WORD, CharFlags.IS_NUMBER)
			}
		})

		test('should return CharKind.OTHER_PUNCTUATION for generic Unicode punctuation characters', () => {
			const lines = [
				// Other Punctuation (Po)
				'¡§¶·¿;·՚՛՜՝՞՟։׀׃׆׳״؉؊،؍؛؞؟٪٫٬٭۔܀܁܂܃܄܅܆܇܈܉܊܋܌܍߷߸߹।॥॰૰෴๏๚๛༄༅༆༇༈༉༊་༌།༎༏༐༑༒༔྅࿐࿑࿒࿓࿔࿙࿚၊။၌၍၎၏჻',
				'፠፡።፣፤፥፦፧፨᙮᛫᛬᛭។៕៖៘៙៚᠀᠁᠂᠃᠄᠅᠇᠈᠉᠊᥄᥅᨞᨟᱾᱿᳓‖‗†‡•‣․‥…‧‰‱′″‴‵‶‷‸※‼‽‾⁁⁂⁃⁇⁈⁉⁊⁋⁌⁍⁎⁏⁐⁑⁓⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞',
				'⳹⳺⳻⳼⳾⳿⵰⸀⸁⸆⸇⸈⸋⸎⸏⸐⸑⸒⸓⸔⸕⸖⸘⸙⸛⸞⸟⸪⸫⸬⸭⸮⸰⸱⸲⸳⸴⸵⸶⸷⸸⸹⸼⸽⸾⸿⹁⹃⹄꓾꓿꘍꘎꘏꙳꙾꡴꡵꡶꡷꣸꣹꣺꣼꧁꧂꧃꧄꧅꧆꧇꧈꧉꧊꧋꧌꧍꧞꧟',
				// Connector Punctuation (Pc)
				'‿⁀⁔︳︴﹍﹎﹏',
				// Dash Punctuation (Pd)
				'֊־᐀᠆‐‑‒–—―⸗⸚⸺⸻⹀︱︲﹘﹣',
				// Open Punctuation (Ps)
				'༺༼᚛‚„⁅⁽₍⌈⌊〈❨❪❬❮❰❲❴⟅⟦⟨⟪⟬⟮⦃⦅⦇⦉⦋⦍⦏⦑⦓⦕⦗⧘⧚⧼⸢⸤⸦⸨⹂﴿︗︵︷︹︻︽︿﹁﹃﹇﹙﹛﹝',
				// Close Punctuation (Pe)
				'༻༽᚜⁆⁾₎⌉⌋〉❩❫❭❯❱❳❵⟆⟧⟩⟫⟭⟯⦄⦆⦈⦊⦌⦎⦐⦒⦔⦖⦘⧙⧛⧽⸣⸥⸧⸩﴾︘︶︸︺︼︾﹀﹂﹄﹈﹚﹜﹞',
				// Initial Punctuation (Pi)
				'«‘‛“‟‹⸂⸄⸉⸌⸜⸠',
				// Final Punctuation (Pf)
				'»’”›⸃⸅⸊⸍⸝⸡',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_PUNCTUATION, CharFlags.NONE)
			}
		})

		test('should return CharKind.OTHER_SYMBOL for generic Unicode graphic characters', () => {
			const lines = [
				// Currency Symbol (Sc)
				'¢£¤¥֏؋߾߿৲৳৻૱௹฿៛₠₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿꠸﷼﹩',
				// Modifier Symbol (Sk)
				'¨¯´¸˂˃˄˅˒˓˔˕˖˗˘˙˚˛˜˝˞˟˥˦˧˨˩˪˫˭˯˰˱˲˳˴˵˶˷˸˹˺˻˼˽˾˿͵΄΅᾽᾿῀῁῍῎῏῝῞῟῭΅`´῾꜀꜁꜂꜃꜄꜅꜆꜇꜈꜉꜊꜋꜌꜍꜎꜏꜐꜑꜒꜓꜔꜕꜖꜠꜡꞉꞊꭛﮲﮳﮴﮵﮶﮷﮸﮹﮺﮻﮼﮽﮾﮿﯀﯁🏻🏼🏽🏾',
				// Math Symbol (Sm)
				'¬±×÷϶؆؇؈⁄⁒⁺⁻⁼₊₋₌℘⅀⅁⅂⅃⅄⅋←↑→↓↔↚↛↠↣↦↮⇎⇏⇒⇔⇴⇵⇶⇷⇸⇹⇺⇻⇼⇽⇾⇿∀∁∂∃∄∅∆∇∈∉∊∋∌∍∎∏∐',
				'∑−∓∔∕∖∗∘∙√∛∜∝∞∟∠∡∢∣∤∥∦∧∨∩∪∫∬∭∮∯∰∱∲∳∴∵∶∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕',
				'≖≗≘≙≚≛≜≝≞≟≠≡≢≣≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔',
				'⊕⊖⊗⊘⊙⊚⊛⊜⊝⊞⊟⊠⊡⊢⊣⊤⊥⊦⊧⊨⊩⊪⊫⊬⊭⊮⊯⊰⊱⊲⊳⊴⊵⊶⊷⊸⊹⊺⊻⊼⊽⊾⊿⋀⋁⋂⋃⋄⋅⋆⋇⋈⋉⋊⋋⋌⋍⋎⋏',
				'⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱⋲⋳⋴⋵⋶⋷⋸⋹⋺⋻⋼⋽⋾⋿⌠⌡⍼⎛⎜⎝⎞⎟⎠⎡⎢⎣⎤⎥⎦⎧⎨⎩⎪⎫⎬⎭⎮⎯⎰⎱⎲⎳⏜⏝⏞⏟⏠⏡',
				'▷◁◸◹◺◻◼◽◾◿♯⟀⟁⟂⟃⟄⟇⟈⟉⟊⟋⟌⟍⟎⟏⟐⟑⟒⟓⟔⟕⟖⟗⟘⟙⟚⟛⟜⟝⟞⟟⟠⟡⟢⟣⟤⟥⟰⟱⟲⟳⟴',
				'⟵⟶⟷⟸⟹⟺⟻⟼⟽⟾⟿⤀⤁⤂⤃⤄⤅⤆⤇⤈⤉⤊⤋⤌⤍⤎⤏⤐⤑⤒⤓⤔⤕⤖⤗⤘⤙⤚⤛⤜⤝⤞⤟⤠⤡⤢⤣⤤⤥⤦',
				'⤧⤨⤩⤪⤫⤬⤭⤮⤯⤰⤱⤲⤳⤴⤵⤶⤷⤸⤹⤺⤻⤼⤽⤾⤿⥀⥁⥂⥃⥄⥅⥆⥇⥈⥉⥊⥋⥌⥍⥎⥏⥐⥑⥒⥓⥔⥕⥖⥗⥘⥙⥚⥛⥜⥝⥞⥟⥠⥡⥢⥣⥤⥥',
				'⥦⥧⥨⥩⥪⥫⥬⥭⥮⥯⥰⥱⥲⥳⥴⥵⥶⥷⥸⥹⥺⥻⥼⥽⥾⥿⦀⦁⦂⦙⦚⦛⦜⦝⦞⦟⦠⦡⦢⦣⦤⦥⦦⦧⦨⦩⦪⦫⦬⦭⦮⦯',
				'⦰⦱⦲⦳⦴⦵⦶⦷⦸⦹⦺⦻⦼⦽⦾⦿⧀⧁⧂⧃⧄⧅⧆⧇⧈⧉⧊⧋⧌⧍⧎⧏⧐⧑⧒⧓⧔⧕⧖⧗⧜⧝⧞⧟⧠⧡⧢⧣⧤⧥⧦⧧⧨⧩',
				'⧪⧫⧬⧭⧮⧯⧰⧱⧲⧳⧴⧵⧶⧷⧸⧹⧺⧻⧾⧿⨀⨁⨂⨃⨄⨅⨆⨇⨈⨉⨊⨋⨌⨍⨎⨏⨐⨑⨒⨓⨔⨕⨖⨗⨘⨙⨚⨛⨜⨝⨞⨟⨠⨡⨢⨣⨤⨥⨦⨧⨨⨩⨪⨫⨬',
				'⨭⨮⨯⨰⨱⨲⨳⨴⨵⨶⨷⨸⨹⨺⨻⨼⨽⨾⨿⩀⩁⩂⩃⩄⩅⩆⩇⩈⩉⩊⩋⩌⩍⩎⩏⩐⩑⩒⩓⩔⩕⩖⩗⩘⩙⩚⩛⩜⩝⩞⩟⩠⩡⩢⩣⩤⩥⩦⩧⩨⩩⩪⩫⩬⩭⩮',
				'⩯⩰⩱⩲⩳⩴⩵⩶⩷⩸⩹⩺⩻⩼⩽⩾⩿⪀⪁⪂⪃⪄⪅⪆⪇⪈⪉⪊⪋⪌⪍⪎⪏⪐⪑⪒⪓⪔⪕⪖⪗⪘⪙⪚⪛⪜⪝⪞⪟⪠⪡⪢⪣⪤⪥⪦⪧⪨⪩',
				'⪪⪫⪬⪭⪮⪯⪰⪱⪲⪳⪴⪵⪶⪷⪸⪹⪺⪻⪼⪽⪾⪿⫀⫁⫂⫃⫄⫅⫆⫇⫈⫉⫊⫋⫌⫍⫎⫏⫐⫑⫒⫓⫔⫕⫖⫗⫘⫙⫚⫛⫝̸⫝⫞⫟⫠⫡⫢',
				'⫣⫤⫥⫦⫧⫨⫩⫪⫫⫬⫭⫮⫯⫰⫱⫲⫳⫴⫵⫶⫷⫸⫹⫺⫻⫼⫽⫾⫿⬰⬱⬲⬳⬴⬵⬶⬷⬸⬹⬺⬻⬼⬽⬾⬿⭀⭁⭂⭃⭄⭇⭈⭉⭊⭋⭌﬩𝛁𝛛𝛻𝜕𝜵𝝏𝝯𝞉𝞩𝟃',
				// Other Symbol (So)
				'¦©®°҂֍֎؎؏۞۩۽۾߶৺୰௳௴௵௶௷௸௺౿൏൹༁༂༃༓༕༖༗༚༛༜༝༞༟༴༶༸྾྿࿀࿁࿂࿃࿄࿅࿇࿈࿉࿊࿋࿌࿎࿏࿕࿖࿗࿘႞႟᎐᎑᎒᎓᎔᎕᎖᎗᎘᎙᙭',
				'᥀᧞᧟᧠᧡᧢᧣᧤᧥᧦᧧᧨᧩᧪᧫᧬᧭᧮᧯᧰᧱᧲᧳᧴᧵᧶᧷᧸᧹᧺᧻᧼᧽᧾᧿᭡᭢᭣᭤᭥᭦᭧᭨᭩᭪᭴᭵᭶᭷᭸᭹᭺᭻᭼℀℁℃℄℅℆℈℉℔№℗',
				'℞℟℠℡™℣℥℧℩℮℺℻⅊⅌⅍⅏↊↋↕↖↗↘↙↜↝↞↟↡↢↤↥↧↨↩↪↫↬↭↯↰↱↲↳↴↵↶↷↸↹↺↻↼↽↾↿⇀⇁⇂⇃⇄⇅⇆⇇⇈⇉⇊⇋',
				'⇌⇍⇐⇑⇓⇕⇖⇗⇘⇙⇚⇛⇜⇝⇞⇟⇠⇡⇢⇣⇤⇥⇦⇧⇨⇩⇪⇫⇬⇭⇮⇯⇰⇱⇲⇳⌀⌁⌂⌃⌄⌅⌆⌇⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌚⌛⌜⌝⌞⌟',
				'⌢⌣⌤⌥⌦⌧⌨⌫⌬⌭⌮⌯⌰⌱⌲⌳⌴⌵⌶⌷⌸⌹⌺⌻⌼⌽⌾⌿⍀⍁⍂⍃⍄⍅⍆⍇⍈⍉⍊⍋⍌⍍⍎⍏⍐⍑⍒⍓⍔⍕⍖⍗⍘⍙',
				'⍚⍛⍜⍝⍞⍟⍠⍡⍢⍣⍤⍥⍦⍧⍨⍩⍪⍫⍬⍭⍮⍯⍰⍱⍲⍳⍴⍵⍶⍷⍸⍹⍺⍻⍽⍾⍿⎀⎁⎂⎃⎄⎅⎆⎇⎈⎉⎊⎋⎌⎍⎎⎏⎐⎑⎒⎓⎔⎕⎖⎗⎘⎙',
				'⎚⎴⎵⎶⎷⎸⎹⎺⎻⎼⎽⎾⎿⏀⏁⏂⏃⏄⏅⏆⏇⏈⏉⏊⏋⏌⏍⏎⏏⏐⏑⏒⏓⏔⏕⏖⏗⏘⏙⏚⏛⏢⏣⏤⏥⏦⏧⏨⏩⏪⏫⏬⏭⏮⏯⏰⏱⏲',
				'⏳⏴⏵⏶⏷⏸⏹⏺⏻⏼⏽⏾⏿␀␁␂␃␄␅␆␇␈␉␊␋␌␍␎␏␐␑␒␓␔␕␖␗␘␙␚␛␜␝␞␟␠␡␢␣␤␥␦⑀⑁⑂⑃⑄⑅⑆⑇⑈⑉⑊',
				'⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
				'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ─',
				'━│┃┄┅┆┇┈┉┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╌╍╎╏═║',
				'╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬╭╮╯╰╱╲╳╴╵╶╷╸╹╺╻╼╽╾╿▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕▖▗▘▙▚▛▜▝▞▟■□▢',
				'▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▸▹►▻▼▽▾▿◀◂◃◄◅◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬',
				'◭◮◯◰◱◲◳◴◵◶◷☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☐☑☒☓☔☕☖☗☘☙☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☰☱☲☳☴☵☶☷',
				'☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟♠♡♢♣♤♥♦♧♨',
				'♩♪♫♬♭♮♰♱♲♳♴♵♶♷♸♹♺♻♼♽♾♿⚀⚁⚂⚃⚄⚅⚆⚇⚈⚉⚊⚋⚌⚍⚎⚏⚐⚑⚒⚓⚔⚕⚖⚗⚘⚙⚚⚛⚜⚝⚞⚟⚠⚡',
				'⚢⚣⚤⚥⚦⚧⚨⚩⚪⚫⚬⚭⚮⚯⚰⚱⚲⚳⚴⚵⚶⚷⚸⚹⚺⚻⚼⚽⚾⚿⛀⛁⛂⛃⛄⛅⛆⛇⛈⛉⛊⛋⛌⛍⛎⛏⛐⛑⛒⛓⛔⛕⛖⛗⛘⛙⛚',
			]
			for (const it of lines) {
				expect(it).eachToHaveCharInfo(CharKind.OTHER_SYMBOL, CharFlags.NONE)
			}
		})

		test('should handle non-normalized and combined sequences', () => {
			expect('は\u{3099}').toHaveCharInfo(CharKind.HIRAGANA)
			expect('a\u{0302}').toHaveCharInfo(
				CharKind.ROMAJI,
				CharFlags.CHAR_ASCII | CharFlags.IS_LETTER | CharFlags.IS_LOWER,
			)
			expect('c\u{0303}\u{0332}').toHaveCharInfo(CharKind.OTHER_WORD, CharFlags.IS_LETTER | CharFlags.IS_LOWER)
		})
	})

	describe('chars.is_kana', () => {
		test('should return false for empty', () => {
			expect(chars.is_kana('')).toBe(false)
		})

		test('should return true for hiragana', () => {
			expect(
				chars.is_kana(
					'あいうえおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゆよらりるれろわゐゑをん',
				),
			).toBe(true)

			expect(chars.is_kana('ぁぃぅぇぉっゃゅょ')).toBe(true)
			expect(chars.is_kana('ゎゕゖゔゟゝゞ')).toBe(true)
		})

		test('should return true for katakana', () => {
			expect(
				chars.is_kana(
					'アイウエオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロヮワヰヱヲンヴ',
				),
			).toBe(true)

			expect(chars.is_kana('ァィゥェォッャュョ')).toBe(true)
			expect(chars.is_kana('ヵヶヷヸヹヺヽヾヿ𛀀')).toBe(true)
			expect(chars.is_kana('ㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ')).toBe(true)
			expect(chars.is_kana('ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ')).toBe(true)
			expect(chars.is_kana('𛀀')).toBe(true)
		})

		test('should return true for kana marks', () => {
			expect(chars.is_kana('〼ーｰ')).toBe(true)
		})

		test('should support combining marks', () => {
			const B = '\u{3099}'
			const P = '\u{309A}'
			expect(
				chars.is_kana(
					`は${B}ひ${B}ふ${B}へ${B}ほ${B}は` +
						`${P}ひ${P}ふ${P}へ${P}ほ${P}` +
						`ハ${B}ヒ${B}フ${B}ヘ${B}ホ${B}` +
						`ハ${P}ヒ${P}フ${P}ヘ${P}ホ${P}` +
						`う${B}わ${B}ワ${B}`,
				),
			).toBe(true)
		})
	})
})

function customizeExpect() {
	// Register our custom matchers with Jest. Those will be available as
	// any other assertion.
	//
	// See https://jestjs.io/docs/en/expect#expectextendmatchers
	return extendExpect(expect, {
		/**
		 * Save as toHaveCharInfo but runs on all characters in the string.
		 */
		eachToHaveCharInfo(received: string, kind: CharKind, flags?: CharFlags) {
			return checkCharInfo({ context: this, received, kind, flags, isAll: true })
		},

		/**
		 * Test the expected value against the return of `chars.getCharInfo`
		 * for the given `kind` and optional `flags`.
		 *
		 * @param kind  Expected kind for the value.
		 * @param flags Expected flags for the value. Ignored if not provided.
		 */
		toHaveCharInfo(received: string, kind: CharKind, flags?: CharFlags) {
			return checkCharInfo({ context: this, received, kind, flags, isAll: false })
		},
	})

	function checkCharInfo(args: {
		context: unknown
		received: string
		isAll: boolean
		kind: CharKind
		flags?: CharFlags
	}) {
		const { isNot } = args.context as { readonly isNot: boolean }

		const charInfoToString = (k: CharKind, f?: CharFlags) =>
			[
				`${CharKind[k] || k}`,
				args.flags !== undefined ? ` with flags ${util.enumToString(CharFlags, f, true)}` : ``,
			].join('')

		const getMessage = (received: string, actual?: readonly [CharKind, CharFlags]) => {
			const codes: number[] = []
			let txt = typeof received === 'string' ? received : ''
			while (txt.length > 0) {
				const next = txt.codePointAt(0)
				codes.push(next!)
				txt = txt.slice(String.fromCodePoint(next!).length)
			}

			const text = [
				`expected getCharInfo(${JSON.stringify(received)})`,
				codes.length
					? ' -- ' + codes.map((x) => 'U+' + x.toString(16).toUpperCase().padStart(4, '0')).join(',')
					: '',
				'\n',
				isNot ? `to not be ` : `to be `,
				charInfoToString(args.kind, args.flags),
				`,\nbut it was`,
				` `,
				actual === undefined ? `undefined` : `${charInfoToString(actual[0], actual[1])}`,
			]
			return text.join('')
		}

		if (args.isAll) {
			let text = args.received
			while (text.length) {
				const next = chars.next_char(text)
				text = text.slice(next.length)

				const actual = chars.get_char_info(next)
				if (actual === undefined) {
					return {
						message: () => getMessage(next, actual),
						pass: isNot,
					}
				}

				const [actualKind, actualFlags] = actual
				const equals = actualKind === args.kind && (args.flags === undefined || actualFlags === args.flags)
				if (equals === isNot) {
					return {
						message: () => getMessage(next, actual),
						pass: equals,
					}
				}
			}

			return { message: () => 'passed', pass: !isNot }
		} else {
			const actual = chars.get_char_info(args.received)
			if (actual === undefined) {
				return {
					message: () => getMessage(args.received, actual),
					pass: isNot,
				}
			}

			const [actualKind, actualFlags] = actual
			const equals = actualKind === args.kind && (args.flags === undefined || actualFlags === args.flags)
			return {
				message: () => getMessage(args.received, actual),
				pass: equals,
			}
		}
	}
}
