function casefy(output: string, input: string) {
	if (/[A-Z]/.test(input[0])) {
		return output.toUpperCase()
	}
	return output
}

export function to_voiced(input: string) {
	if (/^[a-z]+$/i.test(input)) {
		if (/^(chi|ti)$/i.test(input)) {
			return casefy('di', input)
		} else if (/^(shi|si|ci)$/i.test(input)) {
			return casefy('ji', input)
		} else if (/^(tsu|tu)$/i.test(input)) {
			return casefy('du', input)
		} else if (/^ce$/i.test(input)) {
			return casefy('ze', input)
		} else if (/^u$/i.test(input)) {
			return casefy('vu', input)
		} else if (/^wa$/i.test(input)) {
			return casefy('va', input)
		} else if (/^fu$/i.test(input)) {
			return casefy('bu', input)
		}
		switch (input[0].toLowerCase()) {
			case 'k':
			case 'c':
				return casefy('g' + input.slice(1), input)
			case 's':
				return casefy('z' + input.slice(1), input)
			case 't':
				return casefy('d' + input.slice(1), input)
			case 'h':
				return casefy('b' + input.slice(1), input)
		}
	}

	switch (input) {
		case 'か': // ka
		case 'き':
		case 'く':
		case 'け':
		case 'こ':
		case 'カ': // ka
		case 'キ':
		case 'ク':
		case 'ケ':
		case 'コ':
		case 'さ': // sa
		case 'し':
		case 'す':
		case 'せ':
		case 'そ':
		case 'サ': // sa
		case 'シ':
		case 'ス':
		case 'セ':
		case 'ソ':
		case 'た': // ta
		case 'ち':
		case 'つ':
		case 'て':
		case 'と':
		case 'タ': // ta
		case 'チ':
		case 'ツ':
		case 'テ':
		case 'ト':
		case 'は': // ha
		case 'ひ':
		case 'ふ':
		case 'へ':
		case 'ほ':
		case 'ハ': // ha
		case 'ヒ':
		case 'フ':
		case 'ヘ':
		case 'ホ':
		case 'う': // u
		case 'ウ':
		case 'わ': // wa
		case 'ワ':
			return (input + '\u{3099}').normalize()

		// Weird characters and half katakana
		case 'ヵ':
		case 'ヶ':
		case 'ｶ': // ka (halfwidth)
		case 'ｷ':
		case 'ｸ':
		case 'ｹ':
		case 'ｺ':
		case 'ｻ': // sa (halfwidth)
		case 'ｼ':
		case 'ｽ':
		case 'ｾ':
		case 'ｿ':
		case 'ﾀ': // ta (halfwidth)
		case 'ﾁ':
		case 'ﾂ':
		case 'ﾃ':
		case 'ﾄ':
		case 'ﾊ': // ha (halfwidth)
		case 'ﾋ':
		case 'ﾌ':
		case 'ﾍ':
		case 'ﾎ':
		case 'ｳ': // u (halfwidth)
		case 'ﾜ': // wa (halfwidth)
			return input + '\u{3099}'
	}

	return input
}

export function to_semi_voiced(input: string) {
	if (/^[a-z]+$/i.test(input)) {
		if (/^fu$/i.test(input)) {
			return casefy('pu', input)
		}
		if (input[0].toLowerCase() === 'h') {
			return casefy('p' + input.slice(1), input)
		}
	}

	switch (input) {
		case 'は':
		case 'ひ':
		case 'ふ':
		case 'へ':
		case 'ほ':
		case 'ハ':
		case 'ヒ':
		case 'フ':
		case 'ヘ':
		case 'ホ':
		case 'ﾊ':
		case 'ﾋ':
		case 'ﾌ':
		case 'ﾍ':
		case 'ﾎ':
			return (input + '\u{309A}').normalize()
	}

	return input
}
