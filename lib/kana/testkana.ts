// Kana tables used on the tests conversion tests.

/**
 * Arguments for the test entries.
 */
type KanaArgs = {
	/**
	 * IME input. Replaces the romaji input on the romaji -> kana tests.
	 */
	ime?: string | string[]

	/**
	 * If true, the conversion is only valid from kana to romaji. Romaji to kana
	 * is not valid.
	 */
	from_kana?: boolean
	/**
	 * If true, the conversion is only valid from romaji to kana. Never from
	 * kana to romaji.
	 */
	from_romaji?: boolean

	/**
	 * The mapping between kana is only valid from katakana to hiragana. This
	 * has no effect on the romaji mapping.
	 */
	katakana_only?: boolean

	/**
	 * The mapping between kana is only valid from hiragana to katakana. This
	 * has no effect on the romaji mapping.
	 */
	hiragana_only?: boolean
}

/**
 * Entry describing the equivalence between hiragana, katakana, and romaji
 * for the tests.
 */
type Kana = KanaArgs & {
	/** Hiragana text */
	h: string
	/** Katakana text */
	k: string
	/** Romaji text */
	r: string
}

export function romaji_inputs(entry: Kana): string[] {
	if (entry.from_kana) {
		return []
	}
	if (entry.ime) {
		if (typeof entry.ime === 'string') {
			return [entry.ime]
		}
		return entry.ime
	}
	if (entry.r) {
		return [entry.r]
	}
	return []
}

const B = '\u{3099}'
const P = '\u{309A}'

/**
 * Basic kana tests.
 */
export const BASIC_KANA: Kana[] = [
	//
	// Plain syllables
	//

	//
	// A
	//

	x('あ', 'ア', 'A'),
	x('い', 'イ', 'I'),
	x('う', 'ウ', 'U'),
	x('え', 'エ', 'E'),
	x('お', 'オ', 'O'),

	//
	// KA
	//

	x('か', 'カ', 'Ka'),
	x('き', 'キ', 'Ki'),
	x('く', 'ク', 'Ku'),
	x('け', 'ケ', 'Ke'),
	x('こ', 'コ', 'Ko'),

	x('が', 'ガ', 'Ga'),
	x('ぎ', 'ギ', 'Gi'),
	x('ぐ', 'グ', 'Gu'),
	x('げ', 'ゲ', 'Ge'),
	x('ご', 'ゴ', 'Go'),

	// Extra "c" syllables for IME
	x('か', 'カ', 'ca', { from_romaji: true }),
	x('し', 'シ', 'ci', { from_romaji: true }),
	x('せ', 'セ', 'ce', { from_romaji: true }),
	x('こ', 'コ', 'co', { from_romaji: true }),
	x('く', 'ク', 'cu', { from_romaji: true }),

	//
	// SA
	//

	x('さ', 'サ', 'Sa'),
	x('し', 'シ', 'Shi'),
	x('す', 'ス', 'Su'),
	x('せ', 'セ', 'Se'),
	x('そ', 'ソ', 'So'),

	x('ざ', 'ザ', 'Za'),
	x('じ', 'ジ', 'Ji'),
	x('ず', 'ズ', 'Zu'),
	x('ぜ', 'ゼ', 'Ze'),
	x('ぞ', 'ゾ', 'Zo'),

	x('し', 'シ', 'Si', { from_romaji: true }),
	x('じ', 'ジ', 'Zi', { from_romaji: true }),

	//
	// TA
	//

	x('た', 'タ', 'Ta'),
	x('ち', 'チ', 'Chi'),
	x('つ', 'ツ', 'Tsu'),
	x('て', 'テ', 'Te'),
	x('と', 'ト', 'To'),

	x('だ', 'ダ', 'Da'),
	x('ぢ', 'ヂ', 'Di'),
	x('づ', 'ヅ', 'Du'),
	x('で', 'デ', 'De'),
	x('ど', 'ド', 'Do'),

	x('ち', 'チ', 'Ti', { from_romaji: true }),
	x('ぢ', 'ヂ', 'Dji', { from_romaji: true }),
	x('ぢ', 'ヂ', 'Dzi', { from_romaji: true }),
	x('づ', 'ヅ', 'Dzu', { from_romaji: true }),
	x('つ', 'ツ', 'Tu', { from_romaji: true }),

	//
	// NA
	//

	x('な', 'ナ', 'Na'),
	x('に', 'ニ', 'Ni'),
	x('ぬ', 'ヌ', 'Nu'),
	x('ね', 'ネ', 'Ne'),
	x('の', 'ノ', 'No'),

	//
	// HA
	//

	x('は', 'ハ', 'Ha'),
	x('ひ', 'ヒ', 'Hi'),
	x('ふ', 'フ', 'Fu'),
	x('へ', 'ヘ', 'He'),
	x('ほ', 'ホ', 'Ho'),

	x('ふ', 'フ', 'Hu', { from_romaji: true }),

	x('ば', 'バ', 'Ba'),
	x('び', 'ビ', 'Bi'),
	x('ぶ', 'ブ', 'Bu'),
	x('べ', 'ベ', 'Be'),
	x('ぼ', 'ボ', 'Bo'),

	x('ぱ', 'パ', 'Pa'),
	x('ぴ', 'ピ', 'Pi'),
	x('ぷ', 'プ', 'Pu'),
	x('ぺ', 'ペ', 'Pe'),
	x('ぽ', 'ポ', 'Po'),

	//
	// MA
	//

	x('ま', 'マ', 'Ma'),
	x('み', 'ミ', 'Mi'),
	x('む', 'ム', 'Mu'),
	x('め', 'メ', 'Me'),
	x('も', 'モ', 'Mo'),

	//
	// YA
	//

	x('や', 'ヤ', 'Ya'),
	x('ゆ', 'ユ', 'Yu'),
	x('よ', 'ヨ', 'Yo'),

	//
	// RA
	//

	x('ら', 'ラ', 'Ra'),
	x('り', 'リ', 'Ri'),
	x('る', 'ル', 'Ru'),
	x('れ', 'レ', 'Re'),
	x('ろ', 'ロ', 'Ro'),

	//
	// WA & N
	//

	x('わ', 'ワ', 'Wa'),
	x('を', 'ヲ', 'Wo'),

	x('ん', 'ン', 'N', { ime: ['Nn', `N'`] }),

	//
	// Obsolete and weird characters (never generated from romaji)
	//

	x('ゐ', 'ヰ', 'Wi', { ime: 'xWi' }),
	x('ゑ', 'ヱ', 'We', { ime: 'xWe' }),

	n('わ\u{3099}', 'ヷ', 'Va', { ime: 'xVa', katakana_only: true }),
	n('ゐ\u{3099}', 'ヸ', 'Vi', { ime: 'xVi', katakana_only: true }),
	n('ゑ\u{3099}', 'ヹ', 'Ve', { ime: 'xVe', katakana_only: true }),
	n('を\u{3099}', 'ヺ', 'Vo', { ime: 'xVo', katakana_only: true }),

	x('こと', 'ヿ', 'Koto', { from_kana: true, katakana_only: true }),
	x('ゟ', 'ヨリ', 'Yori', { from_kana: true, hiragana_only: true }),

	//
	// Foreign word combinations
	//

	//
	// "D" & "T"
	//

	x('どぅ', 'ドゥ', 'Du', { ime: ['xDu', 'DoXu'] }),
	x('てぃ', 'ティ', 'Ti', { ime: ['xTi', 'TeXi'] }),
	x('でぃ', 'ディ', 'Di', { ime: ['xDi', 'DeXi'] }),

	//
	// "F"
	//

	x('ふぁ', 'ファ', 'Fa'),
	x('ふぃ', 'フィ', 'Fi'),
	x('ふ', 'フ', 'Fu'),
	x('ふぇ', 'フェ', 'Fe'),
	x('ふぉ', 'フォ', 'Fo'),

	//
	// "V"
	//

	x('ゔぁ', 'ヴァ', 'Va'),
	x('ゔぃ', 'ヴィ', 'Vi'),
	x('ゔ', 'ヴ', 'Vu'),
	x('ゔぇ', 'ヴェ', 'Ve'),
	x('ゔぉ', 'ヴォ', 'Vo'),

	//
	// "W"
	//

	x('わ', 'ワ', 'Wa'),
	x('うぃ', 'ウィ', 'Wi'),
	x('う', 'ウ', 'Wu', { from_romaji: true }),
	x('うぇ', 'ウェ', 'We'),
	x('を', 'ヲ', 'Wo'),

	//
	// "Y" Digraphs
	//

	//
	// ki
	//
	x('きゃ', 'キャ', 'Kya'),
	x('きゅ', 'キュ', 'Kyu'),
	x('きぇ', 'キェ', 'Kye'),
	x('きょ', 'キョ', 'Kyo'),

	//
	// gi
	//
	x('ぎゃ', 'ギャ', 'Gya'),
	x('ぎゅ', 'ギュ', 'Gyu'),
	x('ぎぇ', 'ギェ', 'Gye'),
	x('ぎょ', 'ギョ', 'Gyo'),

	//
	// shi
	//
	x('しゃ', 'シャ', 'Sha'),
	x('しゅ', 'シュ', 'Shu'),
	x('しぇ', 'シェ', 'She'),
	x('しょ', 'ショ', 'Sho'),

	//
	// ji
	//
	x('じゃ', 'ジャ', 'Ja'),
	x('じゅ', 'ジュ', 'Ju'),
	x('じぇ', 'ジェ', 'Je'),
	x('じょ', 'ジョ', 'Jo'),

	x('じゃ', 'ジャ', 'Jya', { from_romaji: true }),
	x('じゅ', 'ジュ', 'Jyu', { from_romaji: true }),
	x('じぇ', 'ジェ', 'Jye', { from_romaji: true }),
	x('じょ', 'ジョ', 'Jyo', { from_romaji: true }),

	//
	// zi
	//
	x('じゃ', 'ジャ', 'Zya', { from_romaji: true }),
	x('じゅ', 'ジュ', 'Zyu', { from_romaji: true }),
	x('じぇ', 'ジェ', 'Zye', { from_romaji: true }),
	x('じょ', 'ジョ', 'Zyo', { from_romaji: true }),

	//
	// chi
	//
	x('ちゃ', 'チャ', 'Cha'),
	x('ちゅ', 'チュ', 'Chu'),
	x('ちぇ', 'チェ', 'Che'),
	x('ちょ', 'チョ', 'Cho'),

	x('ちゃ', 'チャ', 'Tya', { from_romaji: true }),
	x('ちゅ', 'チュ', 'Tyu', { from_romaji: true }),
	x('ちぇ', 'チェ', 'Tye', { from_romaji: true }),
	x('ちょ', 'チョ', 'Tyo', { from_romaji: true }),

	//
	// di
	//
	x('ぢゃ', 'ヂャ', 'Dya'),
	x('ぢゅ', 'ヂュ', 'Dyu'),
	x('ぢぇ', 'ヂェ', 'Dye'),
	x('ぢょ', 'ヂョ', 'Dyo'),

	//
	// dj
	//
	x('ぢゃ', 'ヂャ', 'Dja', { from_romaji: true }),
	x('ぢゅ', 'ヂュ', 'Dju', { from_romaji: true }),
	x('ぢぇ', 'ヂェ', 'Dje', { from_romaji: true }),
	x('ぢょ', 'ヂョ', 'Djo', { from_romaji: true }),

	//
	// dz
	//
	x('ぢゃ', 'ヂャ', 'Dza', { from_romaji: true }),
	x('づ', 'ヅ', 'Dzu', { from_romaji: true }),
	x('ぢぇ', 'ヂェ', 'Dze', { from_romaji: true }),
	x('ぢょ', 'ヂョ', 'Dzo', { from_romaji: true }),

	//
	// ni
	//
	x('にゃ', 'ニャ', 'Nya'),
	x('にゅ', 'ニュ', 'Nyu'),
	x('にぇ', 'ニェ', 'Nye'),
	x('にょ', 'ニョ', 'Nyo'),

	//
	// hi
	//
	x('ひゃ', 'ヒャ', 'Hya'),
	x('ひゅ', 'ヒュ', 'Hyu'),
	x('ひぇ', 'ヒェ', 'Hye'),
	x('ひょ', 'ヒョ', 'Hyo'),

	//
	// bi
	//
	x('びゃ', 'ビャ', 'Bya'),
	x('びゅ', 'ビュ', 'Byu'),
	x('びぇ', 'ビェ', 'Bye'),
	x('びょ', 'ビョ', 'Byo'),

	//
	// pi
	//
	x('ぴゃ', 'ピャ', 'Pya'),
	x('ぴゅ', 'ピュ', 'Pyu'),
	x('ぴぇ', 'ピェ', 'Pye'),
	x('ぴょ', 'ピョ', 'Pyo'),

	//
	// mi
	//
	x('みゃ', 'ミャ', 'Mya'),
	x('みゅ', 'ミュ', 'Myu'),
	x('みぇ', 'ミェ', 'Mye'),
	x('みょ', 'ミョ', 'Myo'),

	//
	// ri
	//
	x('りゃ', 'リャ', 'Rya'),
	x('りゅ', 'リュ', 'Ryu'),
	x('りぇ', 'リェ', 'Rye'),
	x('りょ', 'リョ', 'Ryo'),

	//
	// qu & qw
	//
	x('くぁ', 'クァ', 'Qua'),
	x('くぃ', 'クィ', 'Qui'),
	x('くぇ', 'クェ', 'Que'),
	x('くぉ', 'クォ', 'Quo'),

	x('くぁ', 'クァ', 'Qwa', { from_romaji: true }),
	x('くぃ', 'クィ', 'Qwi', { from_romaji: true }),
	x('くぇ', 'クェ', 'Qwe', { from_romaji: true }),
	x('くぉ', 'クォ', 'Qwo', { from_romaji: true }),

	//
	// ye
	//

	x('いぇ', 'イェ', 'Ye'),

	//
	// Small letters
	//

	// Those require special handling for romaji, but as long as they're
	// isolated they generate normal romaji.
	x('ぁ', 'ァ', 'A', { ime: ['xA'] }),
	x('ぃ', 'ィ', 'I', { ime: ['xI'] }),
	x('ぅ', 'ゥ', 'U', { ime: ['xU'] }),
	x('ぇ', 'ェ', 'E', { ime: ['xE'] }),
	x('ぉ', 'ォ', 'O', { ime: ['xO'] }),
	x('っ', 'ッ', '~Tsu', { ime: ['xtsu'] }),
	x('ゃ', 'ャ', 'Ya', { ime: ['xYa'] }),
	x('ゅ', 'ュ', 'Yu', { ime: ['xYu'] }),
	x('ょ', 'ョ', 'Yo', { ime: ['xYo'] }),
	x('ゎ', 'ヮ', 'Wa', { ime: ['xWa'] }),
	x('ゕ', 'ヵ', 'Ka', { ime: ['xKa'] }),
	x('ゖ', 'ヶ', 'Ka', { ime: ['xKe'] }), // https://en.wikipedia.org/wiki/Small_ke

	//
	// Symbols & Punctuation
	//
	// Note that "to romaji" conversions should map to basic ASCII characters,
	// so symbols conversion are for the most part not reversible.
	//

	// Katakana symbols
	x('・', '・', '/'),
	x('ー', 'ー', '-'),

	//
	// Japanese punctuation
	//

	// Ideographic space
	x('\u{3000}', '\u{3000}', ' '),

	x('゠', '゠', '=', { from_kana: true }), // U+30A0 - Katakana-Hiragana Double Hyphen
	x('、', '、', ','), // U+3001 - Ideographic Comma
	x('。', '。', '.'), // U+3002 - Ideographic Full Stop
	x('〈', '〈', '<', { from_kana: true }), // U+3008 - Left Angle Bracket
	x('〉', '〉', '>', { from_kana: true }), // U+3009 - Right Angle Bracket
	x('《', '《', '«'), // U+300A - Left Double Angle Bracket
	x('》', '》', '»'), // U+300B - Right Double Angle Bracket
	x('「', '「', '['), // U+300C - Left Corner Bracket
	x('」', '」', ']'), // U+300D - Right Corner Bracket
	x('『', '『', '[', { from_kana: true }), // U+300E - Left White Corner Bracket
	x('』', '』', ']', { from_kana: true }), // U+300F - Right White Corner Bracket
	x('【', '【', '[', { from_kana: true }), // U+3010 - Left Black Lenticular Bracket
	x('】', '】', ']', { from_kana: true }), // U+3011 - Right Black Lenticular Bracket
	x('〔', '〔', '{', { from_kana: true }), // U+3014 - Left Tortoise Shell Bracket
	x('〕', '〕', '}', { from_kana: true }), // U+3015 - Right Tortoise Shell Bracket
	x('〖', '〖', '[', { from_kana: true }), // U+3016 - Left White Lenticular Bracket
	x('〗', '〗', ']', { from_kana: true }), // U+3017 - Right White Lenticular Bracket
	x('〘', '〘', '{', { from_kana: true }), // U+3018 - Left White Tortoise Shell Bracket
	x('〙', '〙', '}', { from_kana: true }), // U+3019 - Right White Tortoise Shell Bracket
	x('〚', '〚', '[', { from_kana: true }), // U+301A - Left White Square Bracket
	x('〛', '〛', ']', { from_kana: true }), // U+301B - Right White Square Bracket
	x('〜', '〜', '~', { from_kana: true }), // U+301C - Wave Dash
	x('〝', '〝', '"', { from_kana: true }), // U+301D - Reversed Double Prime Quotation Mark
	x('〞', '〞', '"', { from_kana: true }), // U+301E - Double Prime Quotation Mark
	x('〟', '〟', '"', { from_kana: true }), // U+301F - Low Double Prime Quotation Mark

	x('！', '！', '!'), // U+FF01 - Fullwidth Exclamation Mark
	x('＂', '＂', '"'), // U+FF02 - Fullwidth Quotation Mark
	x('＃', '＃', '#'), // U+FF03 - Fullwidth Number Sign
	x('＄', '＄', '$'), // U+FF04 - Fullwidth Dollar Sign
	x('％', '％', '%'), // U+FF05 - Fullwidth Percent Sign
	x('＆', '＆', '&'), // U+FF06 - Fullwidth Ampersand
	x('＇', '＇', `'`), // U+FF07 - Fullwidth Apostrophe
	x('（', '（', '('), // U+FF08 - Fullwidth Left Parenthesis
	x('）', '）', ')'), // U+FF09 - Fullwidth Right Parenthesis
	x('＊', '＊', '*'), // U+FF0A - Fullwidth Asterisk
	x('＋', '＋', '+'), // U+FF0B - Fullwidth Plus Sign
	x('，', '，', ',', { from_kana: true }), // U+FF0C - Fullwidth Comma
	x('－', '－', '-', { from_kana: true }), // U+FF0D - Fullwidth Hyphen-Minus
	x('．', '．', '.', { from_kana: true }), // U+FF0E - Fullwidth Full Stop
	x('／', '／', '/', { from_kana: true }), // U+FF0F - Fullwidth Solidus
	x('：', '：', ':'), // U+FF1A - Fullwidth Colon
	x('；', '；', ';'), // U+FF1B - Fullwidth Semicolon
	x('＜', '＜', '<'), // U+FF1C - Fullwidth Less-Than Sign
	x('＝', '＝', '='), // U+FF1D - Fullwidth Equals Sign
	x('＞', '＞', '>'), // U+FF1E - Fullwidth Greater-Than Sign
	x('？', '？', '?'), // U+FF1F - Fullwidth Question Mark
	x('＠', '＠', '@'), // U+FF20 - Fullwidth Commercial At
	x('［', '［', '[', { from_kana: true }), // U+FF3B - Fullwidth Left Square Bracket
	x('＼', '＼', '\\'), // U+FF3C - Fullwidth Reverse Solidus
	x('］', '］', ']', { from_kana: true }), // U+FF3D - Fullwidth Right Square Bracket
	x('＾', '＾', '^'), // U+FF3E - Fullwidth Circumflex Accent
	x('＿', '＿', '_'), // U+FF3F - Fullwidth Low Line
	x('｀', '｀', '`'), // U+FF40 - Fullwidth Grave Accent
	x('｛', '｛', '{'), // U+FF5B - Fullwidth Left Curly Bracket
	x('｜', '｜', '|'), // U+FF5C - Fullwidth Vertical Line
	x('｝', '｝', '}'), // U+FF5D - Fullwidth Right Curly Bracket
	x('～', '～', '~'), // U+FF5E - Fullwidth Tilde
	x('｟', '｟', '(', { from_kana: true }), // U+FF5F - Fullwidth Left White Parenthesis
	x('｠', '｠', ')', { from_kana: true }), // U+FF60 - Fullwidth Right White Parenthesis

	x('｡', '｡', '.', { from_kana: true }), // U+FF61 - Halfwidth Ideographic Full Stop
	x('｢', '｢', '[', { from_kana: true }), // U+FF62 - Halfwidth Left Corner Bracket
	x('｣', '｣', ']', { from_kana: true }), // U+FF63 - Halfwidth Right Corner Bracket
	x('､', '､', ',', { from_kana: true }), // U+FF64 - Halfwidth Ideographic Comma
	x('･', '･', '/', { from_kana: true }), // U+FF65 - Halfwidth Katakana Middle Dot

	x('￤', '￤', '|', { from_kana: true }), // U+FFE4 - Fullwidth Broken Bar
	x('￨', '￨', '|', { from_kana: true }), // U+FFE8 - Halfwidth Forms Light Vertical

	// Those are exceptions to the ASCII-only rule. We map those symbols to
	// their closest normal-width equivalents:

	x('￩', '￩', '←', { from_kana: true }), // U+FFE9 - Halfwidth Leftwards Arrow
	x('￪', '￪', '↑', { from_kana: true }), // U+FFEA - Halfwidth Upwards Arrow
	x('￫', '￫', '→', { from_kana: true }), // U+FFEB - Halfwidth Rightwards Arrow
	x('￬', '￬', '↓', { from_kana: true }), // U+FFEC - Halfwidth Downwards Arrow
	x('￭', '￭', '■', { from_kana: true }), // U+FFED - Halfwidth Black Square
	x('￮', '￮', '○', { from_kana: true }), // U+FFEE - Halfwidth White Circle

	x('￠', '￠', '¢'), // U+FFE0 - Fullwidth Cent Sign
	x('￡', '￡', '£'), // U+FFE1 - Fullwidth Pound Sign
	x('￢', '￢', '¬'), // U+FFE2 - Fullwidth Not Sign
	x('￣', '￣', '¯'), // U+FFE3 - Fullwidth Macron
	x('￥', '￥', '¥'), // U+FFE5 - Fullwidth Yen Sign
	x('￦', '￦', '₩'), // U+FFE6 - Fullwidth Won Sign

	//
	// Fullwidth ASCII
	//

	x('０', '０', '0', { from_kana: true }),
	x('１', '１', '1', { from_kana: true }),
	x('２', '２', '2', { from_kana: true }),
	x('３', '３', '3', { from_kana: true }),
	x('４', '４', '4', { from_kana: true }),
	x('５', '５', '5', { from_kana: true }),
	x('６', '６', '6', { from_kana: true }),
	x('７', '７', '7', { from_kana: true }),
	x('８', '８', '8', { from_kana: true }),
	x('９', '９', '9', { from_kana: true }),
	x('Ａ', 'Ａ', 'A', { from_kana: true }),
	x('Ｂ', 'Ｂ', 'B', { from_kana: true }),
	x('Ｃ', 'Ｃ', 'C', { from_kana: true }),
	x('Ｄ', 'Ｄ', 'D', { from_kana: true }),
	x('Ｅ', 'Ｅ', 'E', { from_kana: true }),
	x('Ｆ', 'Ｆ', 'F', { from_kana: true }),
	x('Ｇ', 'Ｇ', 'G', { from_kana: true }),
	x('Ｈ', 'Ｈ', 'H', { from_kana: true }),
	x('Ｉ', 'Ｉ', 'I', { from_kana: true }),
	x('Ｊ', 'Ｊ', 'J', { from_kana: true }),
	x('Ｋ', 'Ｋ', 'K', { from_kana: true }),
	x('Ｌ', 'Ｌ', 'L', { from_kana: true }),
	x('Ｍ', 'Ｍ', 'M', { from_kana: true }),
	x('Ｎ', 'Ｎ', 'N', { from_kana: true }),
	x('Ｏ', 'Ｏ', 'O', { from_kana: true }),
	x('Ｐ', 'Ｐ', 'P', { from_kana: true }),
	x('Ｑ', 'Ｑ', 'Q', { from_kana: true }),
	x('Ｒ', 'Ｒ', 'R', { from_kana: true }),
	x('Ｓ', 'Ｓ', 'S', { from_kana: true }),
	x('Ｔ', 'Ｔ', 'T', { from_kana: true }),
	x('Ｕ', 'Ｕ', 'U', { from_kana: true }),
	x('Ｖ', 'Ｖ', 'V', { from_kana: true }),
	x('Ｗ', 'Ｗ', 'W', { from_kana: true }),
	x('Ｘ', 'Ｘ', 'X', { from_kana: true }),
	x('Ｙ', 'Ｙ', 'Y', { from_kana: true }),
	x('Ｚ', 'Ｚ', 'Z', { from_kana: true }),
	x('ａ', 'ａ', 'a', { from_kana: true }),
	x('ｂ', 'ｂ', 'b', { from_kana: true }),
	x('ｃ', 'ｃ', 'c', { from_kana: true }),
	x('ｄ', 'ｄ', 'd', { from_kana: true }),
	x('ｅ', 'ｅ', 'e', { from_kana: true }),
	x('ｆ', 'ｆ', 'f', { from_kana: true }),
	x('ｇ', 'ｇ', 'g', { from_kana: true }),
	x('ｈ', 'ｈ', 'h', { from_kana: true }),
	x('ｉ', 'ｉ', 'i', { from_kana: true }),
	x('ｊ', 'ｊ', 'j', { from_kana: true }),
	x('ｋ', 'ｋ', 'k', { from_kana: true }),
	x('ｌ', 'ｌ', 'l', { from_kana: true }),
	x('ｍ', 'ｍ', 'm', { from_kana: true }),
	x('ｎ', 'ｎ', 'n', { from_kana: true }),
	x('ｏ', 'ｏ', 'o', { from_kana: true }),
	x('ｐ', 'ｐ', 'p', { from_kana: true }),
	x('ｑ', 'ｑ', 'q', { from_kana: true }),
	x('ｒ', 'ｒ', 'r', { from_kana: true }),
	x('ｓ', 'ｓ', 's', { from_kana: true }),
	x('ｔ', 'ｔ', 't', { from_kana: true }),
	x('ｕ', 'ｕ', 'u', { from_kana: true }),
	x('ｖ', 'ｖ', 'v', { from_kana: true }),
	x('ｗ', 'ｗ', 'w', { from_kana: true }),
	x('ｘ', 'ｘ', 'x', { from_kana: true }),
	x('ｙ', 'ｙ', 'y', { from_kana: true }),
	x('ｚ', 'ｚ', 'z', { from_kana: true }),

	//
	// Iteration marks
	//

	// Iteration marks have no default mapping in romaji
	x('ゝ', 'ヽ', ''),
	x('ゞ', 'ヾ', ''),

	// spell-checker: disable

	x('はゝ', 'ハヽ', 'haha', { from_kana: true }),
	x('ばゝ', 'バヽ', 'baba', { from_kana: true }),
	x('ぱゝ', 'パヽ', 'papa', { from_kana: true }),

	x('はゞ', 'ハヾ', 'haba', { from_kana: true }),
	x('ばゞ', 'バヾ', 'baba', { from_kana: true }),
	x('ぱゞ', 'パヾ', 'papa', { from_kana: true }),

	x('はゝゝ', 'ハヽヽ', 'hahaha', { from_kana: true }),
	x('はゞゝゞ', 'ハヾヽヾ', 'habahaba', { from_kana: true }),

	x('ことゝ', 'ヿヽ', 'Kototo', { from_kana: true, katakana_only: true }),
	x('ことゞ', 'ヿヾ', 'Kotodo', { from_kana: true, katakana_only: true }),
	x('ゟゝ', 'ヨリヽ', 'Yoriri', { from_kana: true, hiragana_only: true }),
	x('ゟゞ', 'ヨリヾ', 'Yoriri', { from_kana: true, hiragana_only: true }),

	// spell-checker: enable

	//
	// Halfwidth katakana
	//

	x('を', 'ｦ', 'Wo', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Wo
	x('ぁ', 'ｧ', 'A', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small A
	x('ぃ', 'ｨ', 'I', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small I
	x('ぅ', 'ｩ', 'U', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small U
	x('ぇ', 'ｪ', 'E', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small E
	x('ぉ', 'ｫ', 'O', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small O
	x('ゃ', 'ｬ', 'Ya', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small Ya
	x('ゅ', 'ｭ', 'Yu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small Yu
	x('ょ', 'ｮ', 'Yo', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small Yo
	x('っ', 'ｯ', '~Tsu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Small Tu
	x('ー', 'ｰ', '-', { from_kana: true, katakana_only: true }), // Halfwidth Katakana-Hiragana Prolonged Sound Mark
	x('あ', 'ｱ', 'A', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter A
	x('い', 'ｲ', 'I', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter I
	x('う', 'ｳ', 'U', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter U
	x('え', 'ｴ', 'E', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter E
	x('お', 'ｵ', 'O', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter O
	x('か', 'ｶ', 'Ka', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ka
	x('き', 'ｷ', 'Ki', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ki
	x('く', 'ｸ', 'Ku', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ku
	x('け', 'ｹ', 'Ke', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ke
	x('こ', 'ｺ', 'Ko', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ko
	x('さ', 'ｻ', 'Sa', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Sa
	x('し', 'ｼ', 'Shi', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Si
	x('す', 'ｽ', 'Su', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Su
	x('せ', 'ｾ', 'Se', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Se
	x('そ', 'ｿ', 'So', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter So
	x('た', 'ﾀ', 'Ta', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ta
	x('ち', 'ﾁ', 'Chi', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ti
	x('つ', 'ﾂ', 'Tsu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Tu
	x('て', 'ﾃ', 'Te', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Te
	x('と', 'ﾄ', 'To', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter To
	x('な', 'ﾅ', 'Na', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Na
	x('に', 'ﾆ', 'Ni', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ni
	x('ぬ', 'ﾇ', 'Nu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Nu
	x('ね', 'ﾈ', 'Ne', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ne
	x('の', 'ﾉ', 'No', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter No
	x('は', 'ﾊ', 'Ha', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ha
	x('ひ', 'ﾋ', 'Hi', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Hi
	x('ふ', 'ﾌ', 'Fu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Hu
	x('へ', 'ﾍ', 'He', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter He
	x('ほ', 'ﾎ', 'Ho', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ho
	x('ま', 'ﾏ', 'Ma', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ma
	x('み', 'ﾐ', 'Mi', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Mi
	x('む', 'ﾑ', 'Mu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Mu
	x('め', 'ﾒ', 'Me', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Me
	x('も', 'ﾓ', 'Mo', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Mo
	x('や', 'ﾔ', 'Ya', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ya
	x('ゆ', 'ﾕ', 'Yu', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Yu
	x('よ', 'ﾖ', 'Yo', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Yo
	x('ら', 'ﾗ', 'Ra', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ra
	x('り', 'ﾘ', 'Ri', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ri
	x('る', 'ﾙ', 'Ru', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ru
	x('れ', 'ﾚ', 'Re', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Re
	x('ろ', 'ﾛ', 'Ro', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Ro
	x('わ', 'ﾜ', 'Wa', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter Wa
	x('ん', 'ﾝ', 'N', { from_kana: true, katakana_only: true }), // Halfwidth Katakana Letter N

	// Special cases for half-width
	n(`う${B}`, `ｳ${B}`, `Vu`, { from_kana: true, katakana_only: true }),
	n(`か${B}`, `ｶ${B}`, `Ga`, { from_kana: true, katakana_only: true }),
	n(`き${B}`, `ｷ${B}`, `Gi`, { from_kana: true, katakana_only: true }),
	n(`く${B}`, `ｸ${B}`, `Gu`, { from_kana: true, katakana_only: true }),
	n(`け${B}`, `ｹ${B}`, `Ge`, { from_kana: true, katakana_only: true }),
	n(`こ${B}`, `ｺ${B}`, `Go`, { from_kana: true, katakana_only: true }),
	n(`さ${B}`, `ｻ${B}`, `Za`, { from_kana: true, katakana_only: true }),
	n(`し${B}`, `ｼ${B}`, `Ji`, { from_kana: true, katakana_only: true }),
	n(`す${B}`, `ｽ${B}`, `Zu`, { from_kana: true, katakana_only: true }),
	n(`せ${B}`, `ｾ${B}`, `Ze`, { from_kana: true, katakana_only: true }),
	n(`そ${B}`, `ｿ${B}`, `Zo`, { from_kana: true, katakana_only: true }),
	n(`た${B}`, `ﾀ${B}`, `Da`, { from_kana: true, katakana_only: true }),
	n(`ち${B}`, `ﾁ${B}`, `Di`, { from_kana: true, katakana_only: true }),
	n(`つ${B}`, `ﾂ${B}`, `Du`, { from_kana: true, katakana_only: true }),
	n(`て${B}`, `ﾃ${B}`, `De`, { from_kana: true, katakana_only: true }),
	n(`と${B}`, `ﾄ${B}`, `Do`, { from_kana: true, katakana_only: true }),
	n(`は${B}`, `ﾊ${B}`, `Ba`, { from_kana: true, katakana_only: true }),
	n(`ひ${B}`, `ﾋ${B}`, `Bi`, { from_kana: true, katakana_only: true }),
	n(`ふ${B}`, `ﾌ${B}`, `Bu`, { from_kana: true, katakana_only: true }),
	n(`へ${B}`, `ﾍ${B}`, `Be`, { from_kana: true, katakana_only: true }),
	n(`ほ${B}`, `ﾎ${B}`, `Bo`, { from_kana: true, katakana_only: true }),
	n(`ほ${P}`, `ﾎ${P}`, `Po`, { from_kana: true, katakana_only: true }),
	n(`は${P}`, `ﾊ${P}`, `Pa`, { from_kana: true, katakana_only: true }),
	n(`ひ${P}`, `ﾋ${P}`, `Pi`, { from_kana: true, katakana_only: true }),
	n(`ふ${P}`, `ﾌ${P}`, `Pu`, { from_kana: true, katakana_only: true }),
	n(`へ${P}`, `ﾍ${P}`, `Pe`, { from_kana: true, katakana_only: true }),
	n(`わ${B}`, `ﾜ${B}`, `Va`, { from_kana: true, katakana_only: true }),

	// Test a few of the composite half katakana cases. Those should be derived
	// from the base cases, so no need to test them all.

	x('ふぁ', 'ﾌｧ', 'Fa', { from_kana: true, katakana_only: true }),
	x('ひゃ', 'ﾋｬ', 'Hya', { from_kana: true, katakana_only: true }),
	x('びゃ', 'ﾋ\u{3099}ｬ', 'Bya', { from_kana: true, katakana_only: true }),
	x('ぴゃ', 'ﾋ\u{309A}ｬ', 'Pya', { from_kana: true, katakana_only: true }),
]

/**
 * Double consonant entries generated from the basic entries.
 */
export const DOUBLE_CONSONANTS: Kana[] = BASIC_KANA.filter((it) => {
	// Ignore punctuation, vowel-only syllables and other weirdness
	if (!it.r || /^([aeiou]|x|[^a-z])/i.test(it.r) || /[Ａ-Ｚａ-ｚ]/.test(it.h) || it.h === 'ん') {
		return false
	}
	// Ignore extra ime inputs
	for (const r of romaji_inputs(it)) {
		if (r[0] === 'x') {
			return false
		}
	}
	return true
}).map((it) => ({
	...it,
	h: it.h + 'っ' + it.h,
	k: it.k + 'ッ' + it.k,
	r: it.r + it.r[0] + it.r,
}))

/**
 * Long vowel entries.
 */
export const LONG_VOWELS: Kana[] = BASIC_KANA.filter((it) => {
	// Ignore punctuation, entries that do not finish in a vowel, and other weirdness
	if (!it.r || !/[aeiou]$/i.test(it.r) || it.h === 'ん') {
		return false
	}
	// Ignore extra ime inputs
	for (const r of romaji_inputs(it)) {
		if (r[0] === 'x') {
			return false
		}
	}
	return true
}).flatMap((it) => {
	// Long vowel replacements
	const X = 'AEIOUaeiou' // input
	const A = 'ÂÊÎÔÛâêîôû' // with circumflex
	const B = 'ĀĒĪŌŪāēīōū' // with macron
	const K = 'アエイオウアエイオウ' // Katakana
	const H = 'あえいおうあえいおう' // Hiragana
	const RE_VOWEL = /[aeiou]$/i

	// Replace the vowel in a syllable by a long vowel
	const replace = (input: string, tbOutput: string) => {
		return input.replace(RE_VOWEL, (s) => {
			const index = X.indexOf(s)
			return tbOutput[index]
		})
	}

	// Repeat the last vowel in the input `count` times, translating with the
	// given table
	const repeat = (count: number, input: string, tbOutput: string) => {
		const v = input[input.length - 1]
		const s = tbOutput ? replace(v, tbOutput) : v
		return s.repeat(count)
	}

	return romaji_inputs(it).flatMap((r) => [
		// Long vowel mappings are ambiguous because 'ē' normally maps to 'ei'
		// but can also map to 'ee', and 'ō' usually maps to 'ou' but can also
		// be 'oo'.
		//
		// For that reason we expect explicit long vowels in the romaji to
		// generate a prolonged sound mark on the kana output (including on
		// hiragana).
		//
		// The reverse is also true. We expect a prolonged sound mark on the
		// kana to generate a '-' on the romaji output.
		{
			...it,
			h: it.h + 'ー',
			k: it.k + 'ー',

			// this is the canonical mapping for the above in romaji
			r: r + '-',

			// any of the long vowel representations in romaji should map back
			// to the prolonged sound mark
			ime: [r + '-', replace(r, A), replace(r, B)],
		},

		// Simple double vowels in romaji map back to a prolonged sound mark on
		// katakana.
		{
			...it,
			from_romaji: true,
			h: it.h + repeat(1, r, H),
			k: it.k + 'ー',
			r: r + repeat(1, r, ''),
		},

		// Long repeats on romaji map with a single prolonged sound mark.
		{
			...it,
			from_romaji: true,
			h: it.h + repeat(4, r, H),
			k: it.k + repeat(3, r, K) + 'ー',
			r: r + repeat(4, r, ''),
		},

		// An apostrophe in the romaji can be used to disambiguate a sequence
		// that should not generate a long vowel (e.g. カア -> ka'a)
		{
			...it,
			from_romaji: true,
			h: it.h + repeat(1, r, H),
			k: it.k + repeat(1, r, K),
			r: r + `'` + repeat(1, r, ''),
		},
	])
})

function n(h: string, k: string, r: string, args: KanaArgs = {}): Kana {
	return x(h.normalize(), k.normalize(), r, args)
}

function x(h: string, k: string, r: string, args: KanaArgs = {}): Kana {
	return {
		h: h,
		k: k,
		r,
		...args,
	}
}
