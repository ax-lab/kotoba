import React, { useEffect } from 'react'
import { useHistory, useParams } from 'react-router'

import { duration } from '../../lib'
import * as entries from '../api/entries'
import List from '../components/list'

import './dict.scss'

interface DictProps {
	search: string
	query: entries.Query
}

class ResultListing extends React.Component<DictProps> {
	private _cleanup: Array<() => void> = []

	componentDidMount() {
		this._cleanup.push(this.props.query.on_count_update.on(() => this.forceUpdate()))
		this._cleanup.push(this.props.query.on_page_loaded.on(() => this.forceUpdate()))
		this.props.query.prefetch({ start: 0 })
	}

	componentWillUnmount() {
		this._cleanup.forEach((x) => x())
	}

	render() {
		const query = this.props.query
		const total = query.count
		const elapsed = query.elapsed
		return (
			<>
				<div>
					"{this.props.search}" {total != null ? `found ${total} ${total != 1 ? 'entries' : 'entry'}` : ``}{' '}
					{elapsed ? `in ${duration(elapsed * 1000)}` : ``}
				</div>
				<hr />
				<List
					count={total}
					item={(n, args) => {
						query.prefetch({ start: args.start, count: args.count, cancel_pending: true })
						const entry = query.get(n)
						if (!entry) {
							return <div key={n}>Loading...</div>
						}
						return (
							<div key={entry.id}>
								<strong>
									{entry.word || entry.read}
									{entry.word && entry.word != entry.read ? ` (${entry.read})` : ``}
								</strong>
								<p>
									{entry.text} ({entry.match_mode})
								</p>
							</div>
						)
					}}
				/>
			</>
		)
	}
}

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

	const search = React.useRef('')

	const history = useHistory()

	const [query] = React.useState<entries.Query>(entries.all())

	const lookup = async (text: string) => {
		search.current = text
		console.log('LOOKUP', text)
	}

	useEffect(() => {
		if (search.current != search_text) {
			void lookup(search_text)
		}
	})

	// Called on direct input from the search input.
	const on_search = async (txt: string) => {
		// Navigate to the
		history.push(`/dict/${encodeURIComponent(txt)}`)
		void lookup(txt)
	}

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
			<ResultListing query={query} search={expr} />
		</div>
	)
}

export default Dict
