import { describe, expect, test } from '../lib/testutil'

import { query } from './graph'

describe('GraphQL', () => {
	test('should run query', async () => {
		const result = await query(`query {
			tags(names:["abbr"]) { name text }
		}`)
		expect(result.data).toEqual({
			tags: [{ name: 'abbr', text: 'abbreviation' }],
		})
	})

	test('should load tags', async () => {
		const result = await query(`query {
			tags(names:["n", "abbr"]) { name text }
		}`)
		expect(result.data).toEqual({
			tags: [
				{ name: 'abbr', text: 'abbreviation' },
				{ name: 'n', text: 'noun (common) (futsuumeishi)' },
			],
		})
	})

	test('should load entries', async () => {
		const result = await query(`query {
			entries(
				ids: [
					"1000225" "1000230" "1000310" "1000320" "1000390" "1012070"
					"1020710" "1408340" "1467640" "1469800" "1557630" "2070440"
				]
			) {
				id word read rank frequency jlpt popular
				kanji {
					expr popular
					info { name text }
					priority { name text }
				}
				reading {
					expr popular no_kanji restrict
					info { name text }
					priority { name text }
					pitches {
						value
						tags { name text }
					}
				}
				sense {
					stag_kanji stag_reading xref antonym info
					glossary { text type }
					source   { text lang partial wasei }
					pos      { name text }
					field    { name text }
					misc     { name text }
					dialect  { name text }
				}
			}
		}`)

		// spell-checker: disable
		expect(result.data).toEqual({
			entries: [
				{
					id: '1000225',
					word: '明白',
					read: 'あからさま',
					rank: 9107,
					frequency: 36.76527186037104,
					jlpt: 1,
					popular: false,
					kanji: [
						{
							expr: '明白',
							popular: false,
							info: [
								{
									name: 'ateji',
									text: 'ateji (phonetic) reading',
								},
							],
							priority: [],
						},
						{
							expr: '偸閑',
							popular: false,
							info: [
								{
									name: 'ateji',
									text: 'ateji (phonetic) reading',
								},
							],
							priority: [],
						},
						{
							expr: '白地',
							popular: false,
							info: [
								{
									name: 'ateji',
									text: 'ateji (phonetic) reading',
								},
							],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'あからさま',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
								{
									value: 3,
									tags: [],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'plain',
									type: null,
								},
								{
									text: 'frank',
									type: null,
								},
								{
									text: 'candid',
									type: null,
								},
								{
									text: 'open',
									type: null,
								},
								{
									text: 'direct',
									type: null,
								},
								{
									text: 'straightforward',
									type: null,
								},
								{
									text: 'unabashed',
									type: null,
								},
								{
									text: 'blatant',
									type: null,
								},
								{
									text: 'flagrant',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'adj-na',
									text: 'adjectival nouns or quasi-adjectives (keiyodoshi)',
								},
								{
									name: 'adj-no',
									text: "nouns which may take the genitive case particle 'no'",
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1000230',
					word: '明かん',
					read: 'あかん',
					rank: null,
					frequency: 0,
					jlpt: null,
					popular: false,
					kanji: [
						{
							expr: '明かん',
							popular: false,
							info: [],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'あかん',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
						{
							expr: 'アカン',
							popular: false,
							no_kanji: true,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: ['commonly used with adj-i inflections, e.g. あかんかった, あかんくない, etc.'],
							glossary: [
								{
									text: 'useless',
									type: null,
								},
								{
									text: 'no good',
									type: null,
								},
								{
									text: 'hopeless',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'exp',
									text: 'expressions (phrases, clauses, etc.)',
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [
								{
									name: 'ksb',
									text: 'Kansai-ben',
								},
							],
						},
					],
				},
				{
					id: '1000310',
					word: '馬酔木',
					read: 'あせび',
					rank: 24105,
					frequency: 6.5851287111718655,
					jlpt: null,
					popular: false,
					kanji: [
						{
							expr: '馬酔木',
							popular: false,
							info: [],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'あせび',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'あしび',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'あせぼ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'あせぶ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
						{
							expr: 'アセビ',
							popular: false,
							no_kanji: true,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'Japanese andromeda (Pieris japonica)',
									type: null,
								},
								{
									text: 'lily-of-the-valley',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1000320',
					word: '彼処',
					read: 'あそこ',
					rank: 81033,
					frequency: 0.17,
					jlpt: 5,
					popular: true,
					kanji: [
						{
							expr: '彼処',
							popular: true,
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
							],
						},
						{
							expr: '彼所',
							popular: false,
							info: [],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'あそこ',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
							],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'あすこ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'かしこ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 1,
									tags: [],
								},
							],
						},
						{
							expr: 'アソコ',
							popular: false,
							no_kanji: true,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
						{
							expr: 'あしこ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [
								{
									name: 'ok',
									text: 'out-dated or obsolete kana usage',
								},
							],
							priority: [],
							pitches: [],
						},
						{
							expr: 'あこ',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [
								{
									name: 'ok',
									text: 'out-dated or obsolete kana usage',
								},
							],
							priority: [],
							pitches: [
								{
									value: 1,
									tags: [],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['どこ・1', 'ここ・1', 'そこ・1'],
							antonym: [],
							info: ['place physically distant from both speaker and listener'],
							glossary: [
								{
									text: 'there',
									type: null,
								},
								{
									text: 'over there',
									type: null,
								},
								{
									text: 'that place',
									type: null,
								},
								{
									text: 'yonder',
									type: null,
								},
								{
									text: 'you-know-where',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'pn',
									text: 'pronoun',
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: ['あそこ', 'あすこ', 'アソコ'],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'genitals',
									type: null,
								},
								{
									text: 'private parts',
									type: null,
								},
								{
									text: 'nether regions',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'col',
									text: 'colloquialism',
								},
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['あれほど'],
							antonym: [],
							info: ['something psychologically distant from both speaker and listener'],
							glossary: [
								{
									text: 'that far',
									type: null,
								},
								{
									text: 'that much',
									type: null,
								},
								{
									text: 'that point',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1000390',
					word: 'あっという間に',
					read: 'あっというまに',
					rank: 4726,
					frequency: 98.12481653993332,
					jlpt: null,
					popular: true,
					kanji: [
						{
							expr: 'あっという間に',
							popular: true,
							info: [],
							priority: [
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
						},
						{
							expr: 'あっと言う間に',
							popular: false,
							info: [],
							priority: [],
						},
						{
							expr: 'あっとゆう間に',
							popular: false,
							info: [],
							priority: [],
						},
						{
							expr: 'アッという間に',
							popular: false,
							info: [],
							priority: [],
						},
						{
							expr: 'アッと言う間に',
							popular: false,
							info: [],
							priority: [],
						},
						{
							expr: 'アッとゆう間に',
							popular: false,
							info: [],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'あっというまに',
							popular: true,
							no_kanji: false,
							restrict: ['あっという間に', 'あっと言う間に'],
							info: [],
							priority: [
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
							pitches: [],
						},
						{
							expr: 'あっとゆうまに',
							popular: false,
							no_kanji: false,
							restrict: ['あっと言う間に', 'あっとゆう間に'],
							info: [],
							priority: [],
							pitches: [
								{
									value: 1,
									tags: [],
								},
								{
									value: 0,
									tags: [],
								},
							],
						},
						{
							expr: 'アッというまに',
							popular: false,
							no_kanji: false,
							restrict: ['アッという間に', 'アッと言う間に'],
							info: [],
							priority: [],
							pitches: [],
						},
						{
							expr: 'アッとゆうまに',
							popular: false,
							no_kanji: false,
							restrict: ['アッと言う間に', 'アッとゆう間に'],
							info: [],
							priority: [],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'just like that',
									type: null,
								},
								{
									text: 'in the twinkling of an eye',
									type: null,
								},
								{
									text: 'in the blink of an eye',
									type: null,
								},
								{
									text: 'in the time it takes to say "ah!"',
									type: 'literal',
								},
							],
							source: [],
							pos: [
								{
									name: 'exp',
									text: 'expressions (phrases, clauses, etc.)',
								},
								{
									name: 'adv',
									text: 'adverb (fukushi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
					],
				},
				{
					id: '1012070',
					word: 'まあまあ',
					read: 'まあまあ',
					rank: 14843,
					frequency: 16.488180900747594,
					jlpt: 2,
					popular: true,
					kanji: [],
					reading: [
						{
							expr: 'まあまあ',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
							],
							pitches: [
								{
									value: 1,
									tags: [
										{
											name: 'adj-na',
											text: 'adjectival nouns or quasi-adjectives (keiyodoshi)',
										},
									],
								},
								{
									value: 3,
									tags: [],
								},
								{
									value: 1,
									tags: [
										{
											name: 'adv',
											text: 'adverb (fukushi)',
										},
										{
											name: 'int',
											text: 'interjection (kandoushi)',
										},
									],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'so-so',
									type: null,
								},
								{
									text: 'passable',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'adj-na',
									text: 'adjectival nouns or quasi-adjectives (keiyodoshi)',
								},
								{
									name: 'adv',
									text: 'adverb (fukushi)',
								},
								{
									name: 'int',
									text: 'interjection (kandoushi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'on-mim',
									text: 'onomatopoeic or mimetic word',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: ['used to calming somebody down'],
							glossary: [
								{
									text: 'now, now',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'int',
									text: 'interjection (kandoushi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: ['expression of wonder, surprise, etc.'],
							glossary: [
								{
									text: 'my, my',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'int',
									text: 'interjection (kandoushi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'fem',
									text: 'female term or language',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1020710',
					word: 'アンマウント',
					read: 'アンマウント',
					rank: 85883,
					frequency: 0.13,
					jlpt: null,
					popular: false,
					kanji: [],
					reading: [
						{
							expr: 'アンマウント',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: ['マウント・3'],
							info: [],
							glossary: [
								{
									text: 'unmounting (e.g. a drive)',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
								{
									name: 'vs',
									text: 'noun or participle which takes the aux. verb suru',
								},
							],
							field: [
								{
									name: 'comp',
									text: 'computing',
								},
							],
							misc: [],
							dialect: [],
						},
					],
				},
				{
					id: '1408340',
					word: '太刀',
					read: 'たち',
					rank: 9966,
					frequency: 31.969050298077047,
					jlpt: null,
					popular: true,
					kanji: [
						{
							expr: '太刀',
							popular: true,
							info: [],
							priority: [
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf36',
									text: 'top 18K in the word corpus',
								},
								{
									name: 'spec2',
									text: 'bottom half of common words that do not appear on the word corpus',
								},
							],
						},
						{
							expr: '大刀',
							popular: true,
							info: [],
							priority: [
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf33',
									text: 'top 16.5K in the word corpus',
								},
								{
									name: 'spec2',
									text: 'bottom half of common words that do not appear on the word corpus',
								},
							],
						},
						{
							expr: '横刀',
							popular: false,
							info: [
								{
									name: 'oK',
									text: 'word containing out-dated kanji',
								},
							],
							priority: [],
						},
					],
					reading: [
						{
							expr: 'たち',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf36',
									text: 'top 18K in the word corpus',
								},
								{
									name: 'spec2',
									text: 'bottom half of common words that do not appear on the word corpus',
								},
							],
							pitches: [
								{
									value: 1,
									tags: [],
								},
							],
						},
						{
							expr: 'だいとう',
							popular: true,
							no_kanji: false,
							restrict: ['大刀', '横刀'],
							info: [],
							priority: [
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf33',
									text: 'top 16.5K in the word corpus',
								},
								{
									name: 'spec2',
									text: 'bottom half of common words that do not appear on the word corpus',
								},
							],
							pitches: [
								{
									value: 0,
									tags: [],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'long sword (esp. the tachi, worn on the hip edge down by samurai)',
									type: null,
								},
								{
									text: 'large sword',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: ['大刀'],
							stag_reading: ['たち'],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'straight single-edged Japanese sword (from the mid-Heian period or earlier)',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'hist',
									text: 'historical term',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: ['大刀'],
							stag_reading: ['だいとう'],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'guandao',
									type: null,
								},
								{
									text: 'Chinese glaive',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
					],
				},
				{
					id: '1467640',
					word: '猫',
					read: 'ねこ',
					rank: 2546,
					frequency: 214.23414722319635,
					jlpt: 5,
					popular: true,
					kanji: [
						{
							expr: '猫',
							popular: true,
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
								{
									name: 'news1',
									text: 'top half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf07',
									text: 'top 3.5K in the word corpus',
								},
							],
						},
					],
					reading: [
						{
							expr: 'ねこ',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
								{
									name: 'news1',
									text: 'top half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf07',
									text: 'top 3.5K in the word corpus',
								},
							],
							pitches: [
								{
									value: 1,
									tags: [],
								},
							],
						},
						{
							expr: 'ネコ',
							popular: false,
							no_kanji: true,
							restrict: [],
							info: [],
							priority: [],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'cat (esp. the domestic cat, Felis catus)',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'shamisen',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'geisha',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['猫車'],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'wheelbarrow',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'abbr',
									text: 'abbreviation',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['猫火鉢'],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'clay bed-warmer',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'abbr',
									text: 'abbreviation',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: ['タチ'],
							info: [],
							glossary: [
								{
									text: 'bottom',
									type: null,
								},
								{
									text: 'submissive partner of a homosexual relationship',
									type: 'explanation',
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [
								{
									name: 'uk',
									text: 'word usually written using kana alone',
								},
								{
									name: 'col',
									text: 'colloquialism',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1469800',
					word: 'の',
					read: 'の',
					rank: 1,
					frequency: 168910.15000000002,
					jlpt: null,
					popular: true,
					kanji: [],
					reading: [
						{
							expr: 'の',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
							pitches: [],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['乃'],
							antonym: [],
							info: ['occasionally ん, orig. written 乃 or 之'],
							glossary: [
								{
									text: 'indicates possessive',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'nominalizes verbs and adjectives',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: ['が・1'],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'substitutes for "ga" in subordinate phrases',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: ['often ん'],
							glossary: [
								{
									text: '(at sentence-end, falling tone) indicates a confident conclusion',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: '(at sentence-end) indicates emotional emphasis',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [
								{
									name: 'fem',
									text: 'female term or language',
								},
							],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: '(at sentence-end, rising tone) indicates question',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'prt',
									text: 'particle',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text:
										"if this particle is used in front of an adjective, the adjective may modify the preceding word rather than the following one (it's best to check both ways to see which one makes more sense)",
									type: null,
								},
							],
							source: [],
							pos: [],
							field: [],
							misc: [
								{
									name: 'kirei',
									text: 'From Kirei Cake',
								},
							],
							dialect: [],
						},
					],
				},
				{
					id: '1557630',
					word: '零',
					read: 'れい',
					rank: 29,
					frequency: 15536.932472000643,
					jlpt: 5,
					popular: true,
					kanji: [
						{
							expr: '零',
							popular: true,
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf37',
									text: 'top 18.5K in the word corpus',
								},
							],
						},
						{
							expr: '０',
							popular: true,
							info: [],
							priority: [
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
						},
						{
							expr: '〇',
							popular: true,
							info: [],
							priority: [
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
						},
					],
					reading: [
						{
							expr: 'れい',
							popular: true,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [
								{
									name: 'ichi1',
									text: 'appears in the "Ichimango goi bunruishuu" word corpus',
								},
								{
									name: 'news2',
									text: 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus',
								},
								{
									name: 'nf37',
									text: 'top 18.5K in the word corpus',
								},
								{
									name: 'spec1',
									text: 'top half of common words that do not appear on the word corpus',
								},
							],
							pitches: [
								{
									value: 1,
									tags: [],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'zero',
									type: null,
								},
								{
									text: 'nought',
									type: null,
								},
							],
							source: [],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
					],
				},
				{
					id: '2070440',
					word: 'コッペパン',
					read: 'コッペパン',
					rank: 41113,
					frequency: 1.878134881846687,
					jlpt: null,
					popular: false,
					kanji: [],
					reading: [
						{
							expr: 'コッペパン',
							popular: false,
							no_kanji: false,
							restrict: [],
							info: [],
							priority: [],
							pitches: [
								{
									value: 0,
									tags: [],
								},
								{
									value: 4,
									tags: [],
								},
								{
									value: 3,
									tags: [],
								},
							],
						},
					],
					sense: [
						{
							stag_kanji: [],
							stag_reading: [],
							xref: [],
							antonym: [],
							info: [],
							glossary: [
								{
									text: 'bread roll',
									type: null,
								},
								{
									text: 'hot dog bun',
									type: null,
								},
							],
							source: [
								{
									text: 'coupé',
									lang: 'fre',
									partial: true,
									wasei: true,
								},
								{
									text: 'pão',
									lang: 'por',
									partial: true,
									wasei: true,
								},
							],
							pos: [
								{
									name: 'n',
									text: 'noun (common) (futsuumeishi)',
								},
							],
							field: [],
							misc: [],
							dialect: [],
						},
					],
				},
			],
		})
		// spell-checker: enable
	})
})
