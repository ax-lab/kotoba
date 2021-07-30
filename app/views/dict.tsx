import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router'

import { duration, now } from '../../lib'
import * as graphql from '../api/graphql'
import List from '../components/list'

import './dict.scss'

let id_counter = 0
let last_id = ''

const Dict = () => {
	const input_el = React.createRef<HTMLInputElement>()

	const { expr } = useParams<{ expr: string }>()

	const search_text = decodeURIComponent(expr || '')

	// Synchronize the document title with the search query
	useEffect(() => {
		const title = document.title
		document.title += ' - Words'
		if (search_text) {
			document.title += ` (${search_text})`
		}
		return () => {
			document.title = title
		}
	})

	// Synchronize input text with the route parameter on first mount or reload
	useEffect(() => {
		const input = input_el.current!
		input.value = search_text
		if (input != document.activeElement) {
			input.focus()
			input.select()
		}
	}, [])

	const history = useHistory()

	const [entries, set_entries] = useState<graphql.SearchEntry[]>([])
	const [total, set_total] = useState<number>()
	const [elapsed, set_elapsed] = useState<number>()

	const lookup = async (text: string) => {
		const id = `p${++id_counter}`
		last_id = id
		const start = now()
		const result = await graphql.search(text, { id, limit: 25 })
		if (result.id == last_id) {
			console.log(`request ${result.id} for "${text}" took ${duration(now() - start)}`)
			console.log(result.id, result.page.entries)
			set_entries(result.page.entries)
			set_total(result.total)
			set_elapsed(result.elapsed)
		}
	}

	useEffect(() => {
		void lookup(search_text)
	}, [])

	// Called on direct input from the search input.
	const on_search = async (txt: string) => {
		// Navigate to the
		history.push(`/dict/${encodeURIComponent(txt)}`)
		void lookup(txt)
	}

	const COUNT = 20000000

	return (
		<div className="dict-view">
			<input
				ref={input_el}
				lang="ja"
				defaultValue={expr}
				placeholder="Search..."
				spellCheck={false}
				onInput={(ev) => on_search((ev.target as HTMLInputElement).value)}
			/>
			<hr />
			<div>
				"{search_text}" {total != null ? `found ${total} ${total != 1 ? 'entries' : 'entry'}` : ``}{' '}
				{elapsed ? `in ${duration(elapsed * 1000)}` : ``}
			</div>
			<hr />
			{entries.map((x) => (
				<div key={x.id}>
					<strong>
						{x.word || x.read}
						{x.word && x.word != x.read ? ` (${x.read})` : ``}
					</strong>
					<p>
						{x.text} ({x.match_mode})
					</p>
				</div>
			))}
			<List
				count={COUNT}
				item={(n) => (
					<p
						key={n}
						style={{
							border: '1px solid green',
							borderBottomColor: 'yellow',
							backgroundColor: `rgba(255, 0, 0, ${((n + 1) / COUNT).toFixed(2)})`,
							paddingTop: `${(n % 20) + 10}px`,
							paddingBottom: `${(n % 20) + 10}px`,
						}}
					>
						Item {(n + 1).toString().padStart(4, '0')}
					</p>
				)}
			/>
		</div>
	)
}

export default Dict
