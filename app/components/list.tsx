import { Range } from 'immutable'
import React, { useEffect, useState } from 'react'

import { duration, now } from '../../lib'

import './list.scss'

type ListProps = {
	count: number
	item: (index: number) => React.ReactElement
}
/*
	Virtual List layout
	===================

	This is roughly how the layout of the virtual list works.

	The list contains three main parts:
	- The root scrollable element.
	- The scroller element responsible for generating the list scroll height.
	- The view element which renders the visible rows plus a small buffer.

	The layout calculation is responsible for:
	- Determining the total list height which is applied to the scroller
	  element.
	- Determining visible items at the current scroll position and updating
	  the view render.
	- Applying the proper translateX to the view given the scroll position so
	  that rows are rendered at the right relative position.
	- Limiting the maximum scroll height for very large lists to not exceed the
	  height limit for the browser.
	- Providing a smooth scroll experience as items are rendered in/out and
	  the layout calculations are updated.
	- Supporting "go to" operations such as scroll to top, scroll to bottom, and
	  scroll to a given row.

	Rows are assumed to be a base size until rendered and measure. As rows
	are measured, the layout is smoothly updated. Since the entire scroll
	is virtual, the only effect of differences in the estimated vs actual
	row sizes are the scroll coordinates not reflecting the actual sizes and
	changing as rows are measured. The layout is responsible for maintaining
	a stable position and smooth scrolling even as the scrollbar is updated
	to reflect the actual sizes.

	For very large lists, the maximum scroll height of the list is limited and
	the actual/estimated vertical coordinates are mapped to this limited range.
	To provide a smooth scrolling experience in this case, the layout uses an
	anchor point to which relative scrolling is bound to.

	Layout Anchor
	=============

	A major aspect of the layout procedure is managing the layout anchor that
	provides a stable reference position for the layout.

	The layout anchor links a virtual offset within the list items to an actual
	relative vertical position of the list root element. By mantaining that
	anchor, the visual elements are kept rooted at stable positions even as
	overall layout is updated.

	Initially the anchor is set to the top of the list. Its position can be
	updated programatically by "scroll to" operations and is kept updated as
	the user scrolls through the list.

	Layout Update
	=============

	The layout update function is designed to be called at any given point. It
	will compute the (estimated) total list height, the rendered rows for the
	visible range + buffer zone, and the relative translateX offset to keep the
	scroll anchor position.

	Once the layout is computed, the render of the component is updated. In most
	cases, new layout needs multiple passes as rendered elements are measured
	and the layout parameters change.

 */

/**
 * This helper class is responsible for managing the internal layout state and
 * providing queries that are used in the layout computation.
 *
 * This is kept as a state of the List component so that it survives between
 * multiple render calls, but it is not tied directly to the rendered state
 * (e.g. changes in the Layout internal state do not cause rendering). Instead,
 * this is used by the layout function to compute the layout and then in turn
 * update the render state if necessary.
 */
class Layout {
	private _rows = new Map<number, number>()
	private _count = 0

	/**
	 * Provides a base size to use as estimative for rows that haven't been
	 * measured yet.
	 *
	 * Other than affecting the relative scroll sizes, this mostly affects how
	 * many rows are rendered at once in a first layout attempt when row size is
	 * unknown.
	 */
	private readonly base: number

	version = -1

	get count() {
		return this._count
	}

	set count(n: number) {
		if (n != this._count) {
			this._count = n
			this.version++
		}
	}

	constructor(base: number) {
		this.base = base
	}

	update(index: number, height: number) {
		if (this._rows.get(index) != height) {
			this.version++
		}
		this._rows.set(index, height)
	}

	get height() {
		return this.range_height(0, this.count)
	}

	range_height(start: number, end: number) {
		let size = 0
		for (let i = start; i < Math.min(this.count, end); i++) {
			size += this.row_height(i)
		}
		return size
	}

	row_at(offset: number): [number, number] {
		let current = 0
		for (let i = 0; i < this.count; i++) {
			const next = this.row_height(i)
			if (current + next > offset) {
				return [i, offset - current]
			}
			current += next
		}
		return [-1, 0]
	}

	row_height(index: number) {
		return this._rows.get(index) || this.base
	}
}

/**
 * The anchor indicates the relative scroll position of the visible items
 * in the list by anchoring a row position to a relative viewport offset.
 *
 * This is used so layout changes caused by item resizing don't cause
 * unpredictable scrolling.
 */
type LayoutAnchor = {
	/** Index of the row being anchored. */
	readonly row_index: number

	/** Relative position of the anchor in the row. */
	readonly row_offset?: number

	/**
	 * Indicates if the row offset is relative to the top or bottom of the row.
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
	 * Indicates if the anchor offset is relative to the viewport top or
	 * bottom.
	 */
	readonly view_target?: 'top' | 'bottom'
}

declare global {
	interface Window {
		anchor: LayoutAnchor
	}
}

window.anchor = { view_target: 'top', view_offset: 0, row_offset: 0, row_index: 0 }

const List = ({ count, item }: ListProps) => {
	const el_root = React.createRef<HTMLDivElement>()
	const el_view = React.createRef<HTMLDivElement>()
	const el_scroll = React.createRef<HTMLDivElement>()

	const ITEM_BUFFER = 10

	const [range, set_range] = useState({ sta: 0, end: 0 })

	const [state] = useState({
		layout: new Layout(128),
		scroll: 0,
		height: 0,
		offset: 0,
		ranged: false,
	})

	// This is called on every animation tick to compute the layout
	const calculate_layout = () => {
		const root = el_root.current
		const view = el_view.current
		const scroll = el_scroll.current
		if (!root || !view || !scroll) {
			return
		}

		const start = now()

		const root_rect = root.getBoundingClientRect()

		const layout = state.layout
		layout.count = count // Make sure the layout count is always accurate

		// Measure the size of all currently rendered items and update the
		// layout.
		const items = Array.from(view.querySelectorAll('div.list-row') || [])
		const root_y = root_rect.top
		let selected_row = -1
		let selected_pos = 0
		for (const it of items) {
			const index = +it.getAttribute('data-index')!
			const rect = it.getBoundingClientRect()
			const height = rect.height
			layout.update(index, height)
			// Detect the row currently rendered at the top of the view. We use
			// this to update the anchor on scroll.
			if (rect.top <= root_y && rect.bottom > root_y) {
				selected_row = index
				selected_pos = root_y - rect.top
			}
		}

		if (selected_row < 0) {
			// It is possible that there is no row currently rendered at the
			// view anchor position (this can happen if the user scrolls faster
			// than we can render). In that case we estimate the row based on
			// the layout.
			;[selected_row, selected_pos] = layout.row_at(state.scroll)
		}

		// If the rendered range changes while the user is scrolling we cannot
		// simply update the anchor position because that will be wrong, so we
		// just apply the proper scroll offset to the last anchor.
		const range_offset = state.ranged ? root.scrollTop - state.scroll : 0

		// Check for user scrolling
		const user_scrolled = root.scrollTop != state.scroll
		if (user_scrolled && selected_row >= 0) {
			console.log(`User scrolled to ${selected_row} at ${selected_pos}px`)
			if (range_offset) {
				window.anchor = { ...window.anchor, view_offset: (window.anchor.view_offset || 0) - range_offset }
			} else {
				window.anchor = { row_index: selected_row, row_offset: selected_pos }
			}
		}

		// Update the scroller height to match the computed height.
		const total_height = layout.height
		if (total_height != state.height) {
			console.log(`layout: setting height = ${total_height}px`)
			state.height = total_height
			scroll.style.height = `${total_height}px`
		}

		const anchor = window.anchor

		// Update the scroll position based on the anchor
		const target_anchor =
			layout.range_height(0, anchor.row_index) +
			(anchor.row_target == 'bottom'
				? layout.row_height(anchor.row_index) - (anchor.row_offset || 0)
				: anchor.row_offset || 0)
		const view_offset =
			anchor.view_target == 'bottom' ? root_rect.height - (anchor.view_offset || 0) : anchor.view_offset || 0
		const target_scroll = Math.min(Math.max(0, target_anchor - view_offset), total_height - root_rect.height)

		if (Math.abs(root.scrollTop - target_scroll) >= 1) {
			console.log(`layout: target scroll = ${target_scroll}px`)
			root.scrollTop = target_scroll
		}
		state.scroll = root.scrollTop

		// Compute the current visible range to be rendered in the list view
		const y0 = root.scrollTop
		const y1 = root.scrollTop + root.clientHeight

		const [sta_pos] = layout.row_at(y0)
		const [end_pos] = layout.row_at(y1)

		const sta = Math.max(0, sta_pos - ITEM_BUFFER)
		const end = sta_pos < 0 ? 0 : end_pos < 0 ? count : Math.min(count, end_pos + ITEM_BUFFER)

		if (sta != range.sta || end != range.end) {
			console.log(`layout: range is sta=${sta} end=${end} (${root.scrollTop})`)
			set_range({ sta, end })
			state.ranged = true
		}

		// We want sub-pixel scrolling even if the scrollbar does not support
		// it, so we use the translateY to fix any scroll error.
		const scroll_error = root.scrollTop - target_scroll

		// Compute the offset of the view element to make it visible in the
		// scroll element.
		const new_offset = layout.range_height(0, range.sta) + scroll_error // offset from the non-rendered virtual items
		if (new_offset != state.offset) {
			console.log(`layout: setting offset = ${new_offset}px`)
			state.offset = new_offset
			view.style.transform = `translateY(${new_offset}px)`
		}

		const delta = now() - start
		if (delta >= 2) {
			console.log(`layout took ${duration(delta)}`)
		}
	}

	let next_layout = NaN
	function do_layout() {
		try {
			calculate_layout()
		} finally {
			next_layout = requestAnimationFrame(do_layout)
		}
	}

	useEffect(() => {
		next_layout = requestAnimationFrame(do_layout)
		return () => {
			cancelAnimationFrame(next_layout)
		}
	})

	// For details on the layout see the `.scss` file
	return (
		<div className="list-root" ref={el_root} tabIndex={1}>
			<div className="list-scroller" ref={el_scroll}></div>
			<div className="list-view" ref={el_view}>
				{Range(range.sta, range.end).map((n) => (
					<div className="list-row" data-index={n} key={n}>
						{item(n)}
					</div>
				))}
			</div>
		</div>
	)
}

export default List
