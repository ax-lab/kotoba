import { describe, expect, test } from '../testutil'

import { to_semi_voiced, to_voiced } from './voiced'

describe('voiced', () => {
	describe('to_voiced', () => {
		test('should convert romaji', () => {
			const m: { [index: string]: string } = {
				ka: 'ga',
				ki: 'gi',
				ku: 'gu',
				ke: 'ge',
				ko: 'go',
				sa: 'za',
				shi: 'ji',
				si: 'ji',
				su: 'zu',
				se: 'ze',
				so: 'zo',
				ta: 'da',
				chi: 'di',
				ti: 'di',
				tu: 'du',
				te: 'de',
				to: 'do',
				ha: 'ba',
				hi: 'bi',
				fu: 'bu',
				hu: 'bu',
				he: 'be',
				ho: 'bo',
				ca: 'ga',
				ci: 'ji',
				cu: 'gu',
				ce: 'ze',
				co: 'go',

				KA: 'GA',
				KI: 'GI',
				KU: 'GU',
				KE: 'GE',
				KO: 'GO',
				SA: 'ZA',
				SHI: 'JI',
				SI: 'JI',
				SU: 'ZU',
				SE: 'ZE',
				SO: 'ZO',
				TA: 'DA',
				CHI: 'DI',
				TI: 'DI',
				TU: 'DU',
				TE: 'DE',
				TO: 'DO',
				HA: 'BA',
				HI: 'BI',
				FU: 'BU',
				HU: 'BU',
				HE: 'BE',
				HO: 'BO',
				CA: 'GA',
				CI: 'JI',
				CU: 'GU',
				CE: 'ZE',
				CO: 'GO',
			}
			for (const key of Object.keys(m)) {
				const expected = `${key} = ${m[key]}`
				const actual = `${key} = ${to_voiced(key)}`
				expect(actual).toBe(expected)
			}
		})

		test('should convert kana', () => {
			const m: { [index: string]: string } = {
				か: 'が',
				き: 'ぎ',
				く: 'ぐ',
				け: 'げ',
				こ: 'ご',
				さ: 'ざ',
				し: 'じ',
				す: 'ず',
				せ: 'ぜ',
				そ: 'ぞ',
				た: 'だ',
				ち: 'ぢ',
				つ: 'づ',
				て: 'で',
				と: 'ど',
				は: 'ば',
				ひ: 'び',
				ふ: 'ぶ',
				へ: 'べ',
				ほ: 'ぼ',

				カ: 'ガ',
				キ: 'ギ',
				ク: 'グ',
				ケ: 'ゲ',
				コ: 'ゴ',
				サ: 'ザ',
				シ: 'ジ',
				ス: 'ズ',
				セ: 'ゼ',
				ソ: 'ゾ',
				タ: 'ダ',
				チ: 'ヂ',
				ツ: 'ヅ',
				テ: 'デ',
				ト: 'ド',
				ハ: 'バ',
				ヒ: 'ビ',
				フ: 'ブ',
				ヘ: 'ベ',
				ホ: 'ボ',
			}
			for (const key of Object.keys(m)) {
				const expected = `${key} = ${m[key]}`
				const actual = `${key} = ${to_voiced(key)}`
				expect(actual).toBe(expected)
			}
		})
	})

	describe('to_semi_voiced', () => {
		test('should convert romaji', () => {
			const m: { [index: string]: string } = {
				ha: 'pa',
				hi: 'pi',
				fu: 'pu',
				hu: 'pu',
				he: 'pe',
				ho: 'po',

				HA: 'PA',
				HI: 'PI',
				FU: 'PU',
				HU: 'PU',
				HE: 'PE',
				HO: 'PO',
			}
			for (const key of Object.keys(m)) {
				const expected = `${key} = ${m[key]}`
				const actual = `${key} = ${to_semi_voiced(key)}`
				expect(actual).toBe(expected)
			}
		})

		test('should convert kana', () => {
			const m: { [index: string]: string } = {
				は: 'ぱ',
				ひ: 'ぴ',
				ふ: 'ぷ',
				へ: 'ぺ',
				ほ: 'ぽ',

				ハ: 'パ',
				ヒ: 'ピ',
				フ: 'プ',
				ヘ: 'ペ',
				ホ: 'ポ',
			}
			for (const key of Object.keys(m)) {
				const expected = `${key} = ${m[key]}`
				const actual = `${key} = ${to_semi_voiced(key)}`
				expect(actual).toBe(expected)
			}
		})
	})
})
