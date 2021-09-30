import { Range } from 'immutable'
import React from 'react'

import { duration, now } from '../../lib-ts'
import Scroller, { ScrollerInfo } from '../components/scroller'
import { LayoutCache } from '../util/layout_cache'

import './list.scss'

/**
 * Number of additional pages to render above and below the visible list range
 * to use as a scrolling buffer. One page corresponds to the viewport size.
 *
 * Increasing this will make the rendering slower but provides additional
 * elements to buffer the user scrolling.
 */
const BUFFER_PAGES = 1

/**
 * Minimum height for a buffer page. This is used if the viewport is less than
 * this size.
 */
const MIN_BUFFER_PAGE = 1000

/**
 * Additional arguments passed to the list renderer.
 */
type ListRenderArgs = {
	start: number
	count: number
}

type ListProps = {
	count: number
	item: (index: number, args: ListRenderArgs) => React.ReactElement

	/**
	 * This is used just as a mutable reference to the underlying list of
	 * items so that the list can reset state (e.g. anchor) when a new list
	 * is loaded.
	 */
	list: unknown
}

/**
 * The anchor provides a stable position for the list items by anchoring an
 * item in the virtual list with a viewport offset.
 *
 * This is used to prevent unpredictable movement due to layout changes as list
 * items are rendered and measured, or after a resize.
 *
 * The list always tries to keep the anchor position, changing the scroll
 * position instead. The anchor is only updated in response to the user
 * scrolling (or programatically).
 */
type LayoutAnchor = {
	/** Index of the row being anchored. */
	readonly row_index: number

	/** Relative position of the anchor in the row. */
	readonly row_offset?: number

	/**
	 * Indicates if the row offset is a distance relative to the top or bottom
	 * of the row.
	 */
	readonly row_target?: 'top' | 'bottom'

	/**
	 * Distance of the anchor from the viewport top or bottom (depending on
	 * the value of `view_target`).
	 *
	 * The value increases from top to bottom.
	 */
	readonly view_offset?: number

	/**
	 * Indicates if the anchor offset distance is relative to the viewport top
	 * or bottom.
	 */
	readonly view_target?: 'top' | 'bottom'
}

/**
 * Virtual list component. Provides efficient rendering for a list of virtually
 * infinite length.
 */
class List extends React.Component<ListProps> {
	constructor(props: ListProps) {
		super(props)
	}

	private _anchor: LayoutAnchor = { row_index: 0 }
	private _layout = new LayoutCache(256)

	get anchor(): LayoutAnchor {
		return { ...this._anchor }
	}

	/**
	 * List anchor defines the list item positions relative to the viewport.
	 */
	set anchor(value: LayoutAnchor) {
		this._anchor = { ...value }
		this.forceUpdate()
	}

	/**
	 * Number of items in the list.
	 */
	get count() {
		return this.props.count
	}

	render() {
		return <Scroller render={this.render_content.bind(this)} />
	}

	/**
	 * Called when the props on the component change.
	 */
	componentDidUpdate(prev: ListProps) {
		// Reset the anchor when the underlying list of items changes.
		if (prev.list != this.props.list) {
			this.anchor = { row_index: 0 }
		}
	}

	/**
	 * Measure the size of currently rendered items and update the layout.
	 *
	 * Returns true if any change occurred.
	 */
	private update_layout() {
		const layout = this._layout
		const height = layout.height

		layout.count = this.count

		const items = this._el_list.current?.querySelectorAll('div.list-row')
		if (items) {
			for (let i = 0; i < items.length; i++) {
				const it = items[i]
				const index = +it.getAttribute('data-index')!
				const rect = it.getBoundingClientRect()
				const height = rect.height
				layout.update(index, height)
			}
		}
		return height != layout.height
	}

	private readonly _el_list = React.createRef<HTMLDivElement>()

	private _next_update = -1

	private render_content(info: ScrollerInfo) {
		const start = now()
		const log: unknown[] = []

		const layout = this._layout
		const count = this.count
		layout.count = count

		//----[ Update ]------------------------------------------------------//

		cancelAnimationFrame(this._next_update)
		this._next_update = requestAnimationFrame(() => {
			if (this.update_layout()) {
				this.forceUpdate()
			}
		})

		const update_sta = now()
		this.update_layout()
		const update_dur = now() - update_sta
		if (update_dur > 2) {
			log.push(`measure=${duration(update_dur)}`)
		}

		// Layout parameters
		// -----------------

		const view_size = info.client_height
		const full_size = layout.height

		// The anchor links a position in the virtual list with a position in
		// the client view. This provides a stable reference point for the
		// scrolling even as the size of the list items change.
		//
		// The anchor position is absolute for the layout. Everything is
		// computed so that the anchor is respected. This may take more than
		// one layout pass though, since the actual item sizes may be different
		// than what the layout is considering. Once an item is rendered, its
		// real size is measured and eventually the layout will converge.
		let anchor = { ...this._anchor }

		//================================================================//
		// Direct scrolling
		//================================================================//

		// We handle the easier case of the list being less than max scroll
		// size separately.

		const max_scroll = full_size - view_size

		// Apply the user scrolling to the anchor before computing the
		// layout.
		if (info.scroll != info.scroll_last) {
			// We handle scroll to top and bottom separately to make sure
			// we get proper behavior as the layout updates.
			if (info.scroll <= 0) {
				anchor = { row_index: 0, row_offset: 0, view_offset: 0, view_target: 'top' }
			} else if (info.scroll >= max_scroll) {
				anchor = {
					row_index: count,
					row_offset: 0,
					row_target: 'bottom',
					view_offset: 0,
					view_target: 'bottom',
				}
			} else {
				// For relative scrolling, we just recompute the anchor.
				const [index, offset] = layout.row_at(info.scroll)
				anchor = {
					row_index: index,
					row_offset: offset,
					view_offset: 0,
					view_target: 'top',
				}
			}
		}

		const { sta, end, target_scroll } = this.compute_anchor({ anchor, count, view_size })

		// Since we are rendering just a sub-range of the list, we need to
		// offset the rows so that they appear at the correct position.
		//
		// The view element is a child of the root element, so we can just
		// ignore the scrolling and offset it by the size of the "missing"
		// non-rendered `sta` items.
		info.offset = layout.range_height(0, sta)

		log.push(
			`${sta}/${end} of ${count} at ${info.offset.toFixed(2)}px `,
			`(${info.scroll.toFixed(2)} -> ${target_scroll.toFixed(2)} / ${full_size}px)`,
		)

		this._anchor = anchor

		info.height = full_size
		info.scroll = target_scroll

		const args = {
			start: sta,
			count: end - sta,
		}
		const content = (
			<div className="list-root" ref={this._el_list}>
				{Range(sta, end).map((n) => (
					<div className="list-row" data-index={n} key={n}>
						{this.props.item(n, args)}
					</div>
				))}
			</div>
		)

		//----[ Logging ]-----------------------------------------------------//

		const delta = now() - start
		if (delta > 5) {
			log.push(`Δ=${duration(delta)}`)
		}

		if (log.length) {
			console.log(log.join(' / '))
		}

		return content
	}

	compute_anchor(args: { count: number; view_size: number; anchor: LayoutAnchor }) {
		const layout = this._layout
		const full_size = layout.height
		const view_size = args.view_size
		const anchor = args.anchor

		// Additional buffer to render above/below the list visible range.
		const page_buffer = Math.max(view_size, MIN_BUFFER_PAGE) * BUFFER_PAGES

		// Compute the target anchor position within the virtual list.
		const target_anchor =
			layout.range_height(0, anchor.row_index) +
			(anchor.row_target == 'bottom'
				? layout.row_height(anchor.row_index) - (anchor.row_offset || 0)
				: anchor.row_offset || 0)

		// Compute the anchor position relative to the top of the viewport.
		const view_offset =
			anchor.view_target == 'bottom' ? view_size - (anchor.view_offset || 0) : anchor.view_offset || 0

		// The scroll target is the list position at the viewport top such
		// that `target_anchor` appears exactly at `view_offset`.
		//
		// Note that this is actually clamped to the valid scroll range.
		const max_target_scroll = full_size < view_size ? 0 : full_size - view_size
		const target_scroll = Math.min(Math.max(0, target_anchor - view_offset), max_target_scroll)

		// From the target scroll we compute the visible range to render
		// in the list view, including the buffer.

		// Virtual list coordinates for the visible range.
		const y0 = target_scroll - page_buffer
		const y1 = target_scroll + view_size + page_buffer

		// Convert the list coordinates to item indexes.
		const [y0_index] = layout.row_at(y0)
		const [y1_index] = layout.row_at(y1)

		// Clamp the indexes to a valid range.
		const sta = Math.max(0, y0_index)
		const end = y0_index < 0 ? 0 : y1_index < 0 ? args.count : Math.min(args.count, y1_index + 1)

		return { target_scroll, sta, end, max_target_scroll }
	}
}

export default List
