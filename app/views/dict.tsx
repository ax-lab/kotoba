import React, { useEffect } from 'react'
import { useHistory, useParams } from 'react-router'

import { check, duration, kana } from '../../lib-ts'
import { events } from '../api'
import { save_history } from '../api/client_dict'
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

const DEBUG = false

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
					list={query}
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
				DEBUG && console.log('UPDATED', start, count)
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

	//----[ Kanji stroke order display ]--------------------------------------//

	useEffect(() => {
		let throttled = false
		let element: Element | null = null

		const clear_display = () => {
			document.querySelectorAll('.stroke-order').forEach((x) => x.parentNode?.removeChild(x))
		}

		const scan_cursor = (ev: MouseEvent) => {
			if (throttled) {
				return
			}
			throttled = true
			setTimeout(() => (throttled = false), 50)

			const el = document.elementFromPoint(ev.clientX, ev.clientY)
			if (element != el) {
				clear_display()
				element = el
				if (el && el.tagName == 'SPAN') {
					const text = [...(el.textContent || '')].filter((chr) => kana.is_kanji(chr))
					text &&
						setTimeout(() => {
							if (element == el) {
								const display = document.createElement('div')
								display.classList.add('stroke-order')
								display.textContent = text.join('')
								document.body.appendChild(display)
							}
						}, 250)
				}
			}
		}

		document.addEventListener('mousemove', scan_cursor)
		return () => {
			document.removeEventListener('mousemove', scan_cursor)
			clear_display()
			element = null
		}
	}, [])

	//----[ Dictionary search ]-----------------------------------------------//

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

	const lookup = async (raw_text: string) => {
		const text = raw_text.trim().replace(/\s+/g, ' ')
		if (text == search.current) {
			return
		}

		search.current = text
		input_el.current && (input_el.current.value = raw_text)
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
		history.push(`/dict/${encodeURIComponent(txt)}`)
		void lookup(txt)
	}

	// Remote control

	const remote_enabled_key = 'remote_enabled'

	const [remote, set_remote] = React.useState(!!sessionStorage.getItem(remote_enabled_key))
	const remote_input = React.useRef({
		enabled: remote,
		text: '',
		sequence: 0,
		last_input: '',
		position: 0,
		remote_pos: -1,
		remote_text: '',
	}).current

	const clear_remote_input = () => {
		remote_input.text = ''
		remote_input.last_input = ''
		remote_input.position = 0
		remote_input.remote_pos = -1
		remote_input.remote_text = ''
	}

	const apply_remote_input = (input: HTMLInputElement, text: string) => {
		const sel_inverse = input.selectionDirection == 'backward'
		const sel_sta = input.selectionStart
		const sel_end = input.selectionEnd
		const edit = edit_remote_input({
			input: input.value,
			input_last: remote_input.last_input,
			sel_sta: sel_sta || input.value.length,
			sel_end: sel_end || input.value.length,
			remote_pos: remote_input.position,
			remote_len: remote_input.remote_text.length,
			remote_new: text,
			remote_new_pos: remote_input.text ? -1 : sel_end || input.value.length,
		})
		input.value = edit.input
		input.setSelectionRange(edit.sel_sta, edit.sel_end, sel_inverse ? 'backward' : 'forward')

		remote_input.last_input = edit.input
		remote_input.position = edit.remote_pos
		remote_input.remote_text = text

		input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
	}

	const toggle_remote = () => {
		const enabled = !remote_input.enabled
		if (!enabled) {
			clear_remote_input()
		} else {
			apply_remote_input(input_el.current!, remote_input.text)
		}
		remote_input.enabled = enabled
		if (enabled) {
			sessionStorage.setItem(remote_enabled_key, '1')
		} else {
			sessionStorage.removeItem(remote_enabled_key)
		}
		set_remote(enabled)
	}

	useEffect(() => {
		const input = input_el.current!
		const cleanup = events.watch_remote_input('remote-control', (ev) => {
			if (ev.sequence > remote_input.sequence) {
				if (ev.input == ':enter:') {
					if (remote_input.enabled && remote_input.remote_text) {
						apply_remote_input(input, remote_input.remote_text + ' ')
					}
					clear_remote_input()
				} else {
					if (remote_input.enabled) {
						apply_remote_input(input, ev.input)
					}
					remote_input.text = ev.input
				}
				remote_input.sequence = ev.sequence
			}
		})
		return () => cleanup()
	}, [])

	return (
		<div className="dict-view">
			<div className="input-toolbar">
				<input
					type="search"
					ref={input_el}
					lang="ja"
					defaultValue={search_text}
					placeholder="Search..."
					spellCheck={false}
					onInput={(ev) => on_search((ev.target as HTMLInputElement).value)}
					onKeyPress={(ev) => {
						if (ev.key == 'Enter') {
							const text = (ev.target as HTMLInputElement).value.replace(/[A-Za-z]+/g, (txt) =>
								kana.to_hiragana(txt),
							)
							if (text) {
								save_history(text)
									.then((id) => console.log(`saved "${text}" as ${id}`))
									.catch((err) => console.error('failed to save history', err))
							}
						}
					}}
				/>
				<button
					className={`fas fa-${remote ? 'link' : 'unlink'}`}
					onClick={() => {
						toggle_remote()
						input_el.current?.focus()
					}}
				></button>
			</div>
			<hr />
			<ResultListing query={query} search={search_text} />
		</div>
	)
}

export default Dict

//----------------------------------------------------------------------------//
// Remote edit support
//----------------------------------------------------------------------------//

const DEBUG_EDIT = true
const DEBUG_DIFF = false
const DEBUG_LCS = false

type Diff = {
	type: 'add' | 'del' | 'set'
	prev: string
	next: string
	prev_pos: number
	next_pos: number
}

/**
 * Merge a remote edit input into the current buffer.
 */
function edit_remote_input(args: {
	/** The current value of the input. */
	input: string
	/** The value of the input at the time of the last merge. */
	input_last: string
	/** Selection start position in the input. */
	sel_sta: number
	/** Selection end position in the input. */
	sel_end: number
	/** The position of the current remote input in `input_last`. */
	remote_pos: number
	/** The length of the current remote input in `input_last`. */
	remote_len: number
	/** New remote input to replace the current one. */
	remote_new: string
	/** The position to replace the remote input (`-1` to keep in place). */
	remote_new_pos: number
}) {
	DEBUG_EDIT && console.log('EDIT', JSON.stringify(args))

	// The whole point of this function is to replace the remotely edited
	// portion of the input while keeping the local text and selection stable.
	//
	// To do this, we detect the edits in the input since the last remote edit
	// in a way that we can track the position of the remote section. Then we
	// replace that section while tracking the resulting position of the
	// selection cursor.

	let input = args.input_last

	// Those are the positions tracked by `apply_edit`. The first position is
	// the start of the tracked section.
	const cursor: number[] = []

	// This applies a single edit operation while keeping track of the `cursor`
	// positions.
	//
	// The `is_selection` flag allows us to adjust the tracking behavior between
	// usability (for the selection) and precise tracking (remote text section).
	const apply_edit = (pos: number, del: string, add: string, is_selection: boolean) => {
		// apply the edit to the text
		if (del.length) {
			input = input.slice(0, pos) + input.slice(pos + del.length)
		}
		if (add.length) {
			input = input.slice(0, pos) + add + input.slice(pos)
		}

		// update the cursor positions
		for (let i = 0; i < cursor.length; i++) {
			let c = cursor[i]
			if (add.length && !del.length) {
				// we are only adding text
				if (c > pos) {
					// if the cursor is ahead of the insertion, just update the
					// offset
					c += add.length
				} else if (c == pos) {
					// if the cursor is at the exact position of the insertion
					if (is_selection) {
						// we are tracking the selection cursor
						if (i == 0) {
							// if a remote edit inserts text at the cursor
							// we want to move it ahead, but we don't want to
							// grow a selection to incorporate the added text
							c += add.length
						}
					} else {
						// we are tracking a text section
						if (i == 0) {
							// if this is the first cursor we move it, since we
							// are inserting before the text being tracked
							c += add.length
						}
					}
				}
			} else if (del.length && !add.length) {
				// we are only deleting text
				if (c >= pos + del.length) {
					// if the cursor is ahead of the deleted section, just
					// update the offset
					c -= del.length
				} else if (c > pos) {
					// if the cursor is inside the deleted section, move it
					// to the start
					c = pos
				}
			} else {
				// we are changing text
				const delta = add.length - del.length
				if (c >= pos + del.length) {
					// if the cursor is ahead of the change, just update the
					// offset
					c += delta
				} else if (c > pos) {
					// the cursor is inside the changed section
					if (i == 0) {
						// the first part of the tracked section was deleted,
						// so we move it ahead to keep tracking the remaining
						// portion, excluding the replaced text
						c = pos + add.length
					} else {
						// the latter part of the tracked text was deleted
						c = pos
					}
				}
			}

			cursor[i] = c
		}
	}

	//----[ Apply edits ]-----------------------------------------------------//

	// Build the list of edit operations from the last input to the current value
	const diff = diff_text(args.input_last, args.input)

	// Add the positions of the remote section for tracking
	cursor.length = 0
	cursor.push(args.remote_pos)
	if (args.remote_len) {
		// The second cursor behavior is different, so we avoid adding it unless
		// it is an actual selection.
		cursor.push(args.remote_pos + args.remote_len)
	}

	// Apply all the edits from the previous input value to the actual. This
	// will keep track of the remote text section position.
	//
	// We use inverse order here so that the edit changes don't affect the
	// offsets of the remaining edits.
	for (let i = diff.length - 1; i >= 0; i--) {
		const is_selection = false
		const edit = diff[i]
		switch (edit.type) {
			case 'add':
				apply_edit(edit.prev_pos, '', edit.next, is_selection)
				break
			case 'del':
				apply_edit(edit.prev_pos, edit.prev, '', is_selection)
				break
			case 'set':
				apply_edit(edit.prev_pos, edit.prev, edit.next, is_selection)
				break
		}
	}

	check(input == args.input, `edit result is actual text ("${input}" != "${args.input}")`)

	//----[ Update remote section ]-------------------------------------------//

	// Updated positions of the remote text in the input
	const remote_a = cursor[0]
	const remote_b = cursor[1] || remote_a
	check(
		remote_b >= remote_a && remote_b >= 0 && remote_b <= input.length,
		`remote edit position is valid (${remote_a}, ${remote_b})`,
	)

	const remote_prev = remote_a >= 0 ? input.slice(remote_a, remote_b) : ''
	const remote_next = args.remote_new
	const remote_pos = args.remote_new_pos >= 0 ? args.remote_new_pos : remote_a

	// Add the selection position to the tracking. We want to keep the selection
	// stable as we replace the remotely edited text.
	const is_selection = true
	cursor.length = 0
	cursor.push(args.sel_sta)
	if (args.sel_end != args.sel_sta) {
		cursor.push(args.sel_end)
	}

	// Remove the previous remote section and apply the new one
	if (remote_pos != remote_a) {
		// old and one are at different positions
		apply_edit(remote_a, remote_prev, '', is_selection)

		const delta =
			remote_pos >= remote_a + remote_prev.length
				? -remote_prev.length
				: remote_pos > remote_a
				? -(remote_pos - remote_a)
				: 0
		apply_edit(remote_pos + delta, '', remote_next, is_selection)
	} else {
		// same position, just set the text
		apply_edit(remote_pos, remote_prev, remote_next, is_selection)
	}

	const out = {
		input: input,
		sel_sta: cursor[0],
		sel_end: cursor[1] || cursor[0],
		remote_pos,
	}

	if (DEBUG_EDIT) {
		console.log(`-> ${out.input} (${out.sel_sta}, ${out.sel_end}) @${out.remote_pos}`)
	}

	return out
}

/**
 * Generate the list of edit operations to go from `prev` to `next.
 */
function diff_text(prev: string, next: string) {
	const common = lcs(prev, next)
	common.push({ a: prev.length, b: next.length, s: '' }) // sentinel

	const out: Diff[] = []

	let a = 0
	let b = 0
	for (const it of common) {
		if (a < it.a) {
			if (b < it.b) {
				out.push({
					type: 'set',
					prev: prev.slice(a, it.a),
					prev_pos: a,
					next: next.slice(b, it.b),
					next_pos: b,
				})
			} else {
				out.push({ type: 'del', prev: prev.slice(a, it.a), prev_pos: a, next: '', next_pos: b })
			}
		} else if (b < it.b) {
			out.push({ type: 'add', prev: '', prev_pos: a, next: next.slice(b, it.b), next_pos: b })
		}
		a = it.a + it.s.length
		b = it.b + it.s.length
	}

	if (DEBUG_DIFF) {
		console.log(`diff_text("${prev}", "${next}")`)
		for (const it of out) {
			console.log(`-> ${it.type}: "${it.prev}" (${it.prev_pos}) -> "${it.next}" (${it.next_pos})`)
		}
	}

	return out
}

/**
 * Compute the longest common subsequence of both strings.
 */
function lcs(sa: string, sb: string) {
	type Elem = { a: number; b: number; s: string }

	if (sa == sb) {
		return [{ a: 0, b: 0, s: sa }]
	}

	// aux[a][b] = lcs(sa.slice(a), sb.slice(b))
	const aux: number[][] = []

	// initialize aux
	for (let i = 0; i <= sa.length; i++) {
		aux.push([])
	}

	// compute the LCS for each pair of positions
	for (let a = sa.length - 1; a >= 0; a--) {
		for (let b = sb.length - 1; b >= 0; b--) {
			aux[a][b] = sa[a] == sb[b] ? 1 + (aux[a + 1][b + 1] || 0) : Math.max(aux[a + 1][b] || 0, aux[a][b + 1] || 0)
		}
	}

	const out = common(0, 0, [])

	if (DEBUG_LCS) {
		console.log(`LCS(${sa}, ${sb}):`)
		for (const it of out.map((x) => `${x.s} a[${x.a}] = b[${x.b}]`)) {
			console.log(`-> ${it}`)
		}
	}

	return out

	// helper to build the end result
	function common(a: number, b: number, out: Array<Elem>): Array<Elem> {
		if (!aux[a][b]) {
			return out // no common sub-sequence
		}

		if (sa[a] == sb[b]) {
			const prev = out.length && out[out.length - 1]
			if (prev && prev.a == a - prev.s.length && prev.b == b - prev.s.length) {
				prev.s += sa[a]
			} else {
				out.push({ s: sa[a], a, b })
			}
			return common(a + 1, b + 1, out)
		}

		if ((aux[a + 1][b] || 0) > (aux[a][b + 1] || 0)) {
			return common(a + 1, b, out)
		} else {
			return common(a, b + 1, out)
		}
	}
}
