import React, { useEffect } from 'react'
import { useHistory, useParams } from 'react-router'

import { duration } from '../../lib'
import * as entries from '../api/entries'
import List from '../components/list'

import './dict.scss'
import EntryView from './entry_view'

/*
	----------------------------------------------------------------------------
	TODO
	----------------------------------------------------------------------------

	Back-end:
	- Implement word de-inflection
	- Allow querying entire phrases
	- Display matched information on the results
	- Kanji lookup
	- Maybe return related words on a query? (same kanji/reading)
	- Improve sorting of results by relevance
	- Allow searching by english word
	- Add name entries to dictionary

	Rendering:
	- Render pitch information
	- Add kanji information
	- Kanji drawing order

	Future improvements:
	- Favorite words
	- History
	- Custom notes
	- Phrases
*/

interface DictProps {
	search: string
	query: entries.Query
}

class ResultListing extends React.Component<DictProps> {
	componentDidMount() {
		this.init_query()
	}

	componentDidUpdate(props: DictProps) {
		if (props.query !== this.props.query) {
			this.deinit_query()
			this.init_query()
		}
	}

	componentWillUnmount() {
		this.deinit_query()
	}

	render() {
		const query = this.props.query
		const total = query.count
		const elapsed = query.elapsed
		const label = this.props.search ? `"${this.props.search || ''}" found ` : `Found `
		const found = total != null ? `${total} ${total != 1 ? 'entries' : 'entry'}` : ``
		const message = query.complete ? `${label}${found}` : `${label} ${found}...`
		return (
			<>
				<div>
					{message}
					{elapsed ? (query.complete ? ` in ` : ` `) + duration(elapsed * 1000) : ''}
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
						return <EntryView key={entry.id} entry={entry} />
					}}
				/>
			</>
		)
	}

	//------------------------------------------------------------------------//
	// Query handling
	//------------------------------------------------------------------------//

	private readonly _cleanup_query_fns: Array<() => void> = []

	/**
	 * Register the handlers for the query update events.
	 */
	private init_query() {
		const query = this.props.query
		this._cleanup_query_fns.push(query.on_update.on(() => this.forceUpdate()))
		this._cleanup_query_fns.push(
			query.on_page_loaded.on(({ start, count }) => {
				console.log('UPDATED', start, count)
				this.forceUpdate()
			}),
		)
		this._cleanup_query_fns.push(() => query.dispose())
		query.prefetch({ start: 0 })
	}

	/**
	 * Run the query cleanup callbacks to unregister the query event handlers.
	 */
	private deinit_query() {
		this._cleanup_query_fns.forEach((x) => x())
		this._cleanup_query_fns.length = 0
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

	const [query, set_query] = React.useState<entries.Query>(entries.all())

	const lookup = async (text: string) => {
		text = text.trim().replace(/\s+/g, ' ')
		if (text == search.current) {
			return
		}

		console.log('LOOKUP', text)
		search.current = text
		if (text == '') {
			set_query(entries.all())
		} else {
			set_query(entries.search(text))
		}
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
				type="search"
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
