import React from 'react'

import { RE_JAPANESE } from '../../lib'

export default function Japanese(text: string) {
	if (!text) return <></>

	return text.split('\n').map((input, p) => {
		const re = RE_JAPANESE
		re.lastIndex = 0

		const blocks: Array<{ text: string; lang?: string }> = []

		let offset = 0
		for (let m = re.exec(input); m; m = re.exec(input)) {
			if (m.index > offset) {
				blocks.push({ text: input.slice(offset, m.index) })
			}
			blocks.push({ text: m[0], lang: 'jp' })
			offset = m.index + m[0].length
		}
		if (offset < input.length) {
			blocks.push({ text: input.slice(offset) })
		}

		return (
			<p key={`line-${p + 1}`}>
				{blocks.map((x, i) => (
					<span key={i} lang={x.lang}>
						{x.text}
					</span>
				))}
			</p>
		)
	})
}
