import React, { useEffect } from 'react'
import { useHistory, useParams } from 'react-router'

import { query } from '../api/graphql'

import './dict.scss'

const Dict = () => {
	const input_el = React.createRef<HTMLInputElement>()

	const { expr } = useParams<{ expr: string }>()

	const search_text = decodeURIComponent(expr || '')

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

	useEffect(() => {
		const input = input_el.current!
		input.value = search_text
		if (input != document.activeElement) {
			input.focus()
			input.select()
		}
	}, [])

	const history = useHistory()

	const lookup = async (search: string) => {
		console.log(`Looking up "${search}"`)
		const data =
			search &&
			(await query(
				`
			query($id: String, $search: String!) {
				search(id: $id, query: $search) {
					id total elapsed loading
					page(offset: 0, limit: 25) {
						offset limit
						entries {
							id
							match_mode
							word read text
						}
					}
				}
			}
			`,
				{ search },
			))
		console.log(search, data)
	}

	useEffect(() => {
		void lookup(search_text)
	}, [])

	const search = async (txt: string) => {
		history.push(`/dict/${encodeURIComponent(txt)}`)
		void lookup(txt)
	}

	return (
		<>
			<input
				ref={input_el}
				defaultValue={expr}
				placeholder="Search..."
				spellCheck={false}
				onInput={(ev) => search((ev.target as HTMLInputElement).value)}
			/>
			<hr />
			<div>{search_text}</div>
		</>
	)
}

export default Dict
