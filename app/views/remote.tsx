import React from 'react'

import { query } from '../api/graphql'

import './remote.scss'

const Remote = () => {
	let counter = Date.now()

	// Called on direct input from the search input.
	const on_search = async (txt: string) => {
		await query(
			`mutation ($text: String!, $sequence: Float!) {
				remote_input(input: $text, sequence: $sequence)
			}`,
			{ text: txt, sequence: ++counter },
		)
	}

	return (
		<div className="remote-view">
			<input
				type="search"
				lang="ja"
				placeholder="Search..."
				spellCheck={false}
				onInput={(ev) => on_search((ev.target as HTMLInputElement).value)}
				onKeyDown={(ev) => {
					if (ev.key == 'Enter') {
						;(ev.target as HTMLInputElement).value = ''
						void on_search(':enter:')
					}
				}}
			/>
		</div>
	)
}

export default Remote
