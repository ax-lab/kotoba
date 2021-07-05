import { Range } from 'immutable'
import React, { useEffect, useState } from 'react'

import { duration, now } from '../../lib'

import './list.scss'

/**
 * Due to browser limitations we cannot have infinite scrollbar height. This
 * is the maximum the list layout will consider before changing to percentage
 * scrolling.
 *
 * This only really affects jump scrolling (e.g. using the scrollbar to jump
 * directly to a point in the list). This value must still be large enough to
 * make the maximum scroll height much larger than the visible height.
 */
const MAX_SCROLL_HEIGHT = 300_000

/**
 * Number of additional pages to render above and below the visible list range
 * to use as a scrolling buffer. One page corresponds to the viewport size.
 *
 * Increasing this will make the rendering slower but reduces the chance
 * of items not being visible as the list is scrolled.
 */
const BUFFER_PAGES = 1

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
class LayoutCache {
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

	const [render_sta, set_render_sta] = useState(0)
	const [render_end, set_render_end] = useState(0)

	const [state] = useState({
		layout: new LayoutCache(128),
		scroll: 0,
		scroll_to: 0,
	})

	// This is called on every animation tick to compute the layout
	const calculate_layout = () => {
		const root = el_root.current
		const view = el_view.current
		const scroll = el_scroll.current

		// Check that the component is actually rendered
		if (!root || !view || !scroll) {
			return
		}

		const start = now()

		// The anchor is the absolute linchpin of our layout. Whatever item
		// and offset the anchor position points to must absolutely be on the
		// screen at that position when the layout completes. This is essential
		// to a smooth user experience as we handle the unpredictability of
		// not having a fixed (or even known) row size, as the anchor is only
		// updated by user scrolling or programatically.
		//
		// Note that a single run of the layout is not enough to actually
		// achieve that, as we don't know the size of items until after we
		// first render them (and those sizes can change). We do continuous
		// layout passes until the layout stabilizes.

		// The anchor defines the target scrolling position for the list. The
		// essential goal of the layout procedure is to make this true.
		//
		// As every other part of the layout is subject to change unpredictably
		// as rows are rendered/measured/resized, this is the absolute linchpin
		// of the layout and essential for a smooth and stable UI experience.
		//
		// Also, since we don't know the size of rows until we render them (and
		// since they can change), reaching a stable layout at target anchor
		// requires multiple passes.
		const anchor = window.anchor

		// Other than programatical change, user scrolling input is the only
		// thing that changes the anchor (otherwise the user would not be able
		// to scroll the list).
		//
		// We need to monitor the scroll position change between layout runs
		// while properly detecting if it was caused by the user (and not by
		// the layout resizing). The scroll change is then applied to the
		// anchor which will update the list to scroll position.
		//
		// When scrolling, we also differ between relative scrolling (smooth)
		// and absolute (e.g. jumping to a position using the scrollbar). The
		// main reason for this is that we cannot trust the absolute scrollTop
		// value for relative scrolling (e.g. when using percentage scrolling).
		const scroll_delta = state.scroll_to - state.scroll

		// Update layout state
		// -------------------
		//
		// Make sure the layout state is update before we compute the new layout

		const root_rect = root.getBoundingClientRect()

		const layout = state.layout
		layout.count = count

		// Measure the size of all currently rendered items and update the
		// layout cache.
		const items = Array.from(view.querySelectorAll('div.list-row') || [])
		for (const it of items) {
			const index = +it.getAttribute('data-index')!
			const rect = it.getBoundingClientRect()
			const height = rect.height
			layout.update(index, height)
		}

		// These are updated values for the view height (visible page size) and
		// the estimated total layout height.
		const view_height = root_rect.height
		const total_height = layout.height

		// Compute the new layout
		// ----------------------

		// Additional buffer to render above/below the list visible range.
		const buffer = view_height * BUFFER_PAGES

		// The target anchor position is the estimated absolute pixel offset of
		// the anchor within the virtual list of items.
		const target_anchor =
			layout.range_height(0, anchor.row_index) +
			(anchor.row_target == 'bottom'
				? layout.row_height(anchor.row_index) - (anchor.row_offset || 0)
				: anchor.row_offset || 0) +
			scroll_delta

		// This is the offset of the `target_anchor` within the view.
		const view_offset =
			anchor.view_target == 'bottom' ? view_height - (anchor.view_offset || 0) : anchor.view_offset || 0

		// Note that both the target_anchor and view_offset above are "virtual"
		// coordinates that can link any point relative to the list and view
		// elements. We clamp those values to a value scroll position later in
		// the layout calculation.

		// Compute the scroll position. This is necessary to compute the actual
		// visible range.

		// Compute the scrolling:

		// Direct scroll means that our total height is within the browser
		// limits so we can use absolute scrolling. Otherwise we switch to
		// percentage scrolling.
		const direct_scroll = total_height <= MAX_SCROLL_HEIGHT

		// Actual scroll height to be applied to the scroller element.
		const scroll_height = direct_scroll ? total_height : MAX_SCROLL_HEIGHT

		// The target scroll position considering the anchor. This is in the
		// virtual list coordinates which may not correspond to the final scroll
		// due to browser limitations.
		const max_target_scroll = total_height - view_height
		const target_scroll = Math.min(Math.max(0, target_anchor - view_offset), max_target_scroll)

		// Compute the new anchor
		const new_anchor = { ...anchor }
		new_anchor.row_offset =
			(new_anchor.row_offset || 0) + (new_anchor.row_target == 'bottom' ? -1 : +1) * scroll_delta
		window.anchor = new_anchor

		// The actual scroll position to apply to `scrollTop`
		const scroll_position = direct_scroll
			? target_scroll
			: (() => {
					// Compute percentage scrolling if our height exceeds the browser
					// limits.

					// If our rendered range is at the start or end of the list,
					// we must ensure that the scroll offset to the list bounds
					// is the actual one.
					if (target_scroll <= buffer) {
						return target_scroll
					}
					if (target_scroll >= total_height - buffer - view_height) {
						return scroll_height - (total_height - target_scroll)
					}

					// Even if we are not rendering the list bounds, if we are
					// close enough to it we must ensure that the we have enough
					// scroll offset to allow scrolling up or down.
					//
					// This is the amount of scroll offset we will always keep
					// at both ends of the scroll bar.
					const scroll_buffer = view_height * Math.max(3, 3 * BUFFER_PAGES)
					const min_scroll = scroll_buffer
					const max_scroll = scroll_height - min_scroll

					// Compute the scroll percentage coordinates
					const percent_scroll = (target_scroll / total_height) * scroll_height
					return Math.max(Math.min(percent_scroll, max_scroll), min_scroll)
			  })()

		// Compute the current visible range to be rendered in the list view,
		// including the buffer zone, based on the above offsets:

		// Absolute coordinates of the target rendered range, including buffer.
		const y0 = target_scroll - buffer

		// Row index of the of the target render range.
		const [y0_index] = layout.row_at(y0)

		// Make sure the start/end indexes are a valid range. Note that `end` is
		// exclusive.
		const sta = Math.max(0, y0_index)

		// Compute the actual offset for the target rendered range.
		const sta_offset = layout.range_height(0, sta)

		// Compute the end of render range after the start so we properly
		// consider clipping.
		const y1 = target_scroll + view_height + buffer
		const [y1_index] = layout.row_at(y1)
		const end = y0_index < 0 ? 0 : y1_index < 0 ? count : Math.min(count, y1_index + 1)

		// Apply the layout
		// ----------------

		scroll.style.height = `${total_height}px`
		root.scrollTop = scroll_position

		// We want sub-pixel scrolling even if the scrollbar coordinates are
		// integers. We compute the difference and apply it to the view element
		// using a translate transform.
		const scroll_error = root.scrollTop - scroll_position

		// The view element only renders the visible range, so we need to offset
		// it in the parent element to simulate its relative position.
		const new_offset = sta_offset + scroll_error // offset from the non-rendered virtual items
		view.style.transform = `translateY(${new_offset}px)`

		// Update the rendered range.
		set_render_sta(sta)
		set_render_end(end)

		// Save the current scroll position so that we can detect user
		// scrolling.
		state.scroll = root.scrollTop
		state.scroll_to = root.scrollTop

		const delta = now() - start
		const p = (v: number, pad = 3) => `${v.toString().padStart(pad, '0')}`
		console.log(
			`${p(render_sta)}/${p(render_end)}`,
			`h=${p(state.scroll, 6)}/${p(total_height, 6)}px || s=${scroll_position}/${scroll_height}px`,
			`${delta > 5 ? 'Δ=' + duration(delta) : ''}`,
			`scroll=${scroll_delta}`,
		)
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
		<div
			className="list-root"
			ref={el_root}
			tabIndex={1}
			onScroll={(ev) => (state.scroll_to = (ev.target as HTMLDivElement).scrollTop)}
		>
			<div className="list-scroller" ref={el_scroll}></div>
			<div className="list-view" ref={el_view}>
				{Range(render_sta, render_end).map((n) => (
					<div className="list-row" data-index={n} key={n}>
						{item(n)}
					</div>
				))}
			</div>
		</div>
	)
}

export default List
