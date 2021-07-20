import { Range } from 'immutable'
import React, { useEffect, useRef, useState } from 'react'

import { duration, now } from '../../lib'
import { LayoutCache } from '../util/layout_cache'

import './list.scss'

/**
 * Due to browser limitations we cannot have infinite scrollbar height. This
 * is the maximum the list layout will consider before scaling the scrollbar.
 *
 * When the scrollbar is scaled, the absolute scrolling position no longer
 * corresponds to the exact scrollbar position. Since this is used for very
 * large lists this should not be an issue.
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

/**
 * Minimum height for a buffer page, even if the view height is less than this.
 */
const MIN_BUFFER_PAGE = 1000

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
		layout: LayoutCache
	}
}

window.anchor = { view_target: 'top', view_offset: 0, row_offset: 0, row_index: 0 }

const List = ({ count, item }: ListProps) => {
	const el_root = React.createRef<HTMLDivElement>()
	const el_view = React.createRef<HTMLDivElement>()
	const el_scroll = React.createRef<HTMLDivElement>()

	const [range, set_range] = useState({ sta: 0, end: 0 })

	const state_ref = useRef({
		layout: new LayoutCache(256),
		scroll: 0,
		scroll_to: 0,
	})

	const state = state_ref.current

	// This is called on every animation tick to compute the layout
	const calculate_layout = () => {
		const root = el_root.current
		const view = el_view.current
		const scroll = el_scroll.current

		window.layout = state.layout

		const log: unknown[] = []

		// Check that the component is actually rendered
		if (!root || !view || !scroll) {
			return
		}

		const start = now()

		// Update layout state
		// -------------------
		// Make sure the internal layout state is update before we compute
		// anything for the new layout.

		const layout = state.layout
		layout.count = count

		const t0 = now()

		// Measure the size of all currently rendered items and update the
		// layout cache.
		const items = Array.from(view.querySelectorAll('div.list-row') || [])
		for (const it of items) {
			const index = +it.getAttribute('data-index')!
			const rect = it.getBoundingClientRect()
			const height = rect.height
			layout.update(index, height)
		}

		const d0 = now() - t0
		if (d0 > 2) {
			log.push(`measure=${duration(d0)}`)
		}

		// Layout parameters
		// -----------------

		const root_rect = root.getBoundingClientRect()
		const view_size = root_rect.height
		const full_size = layout.height

		// Additional buffer to render above/below the list visible range.
		const page_buffer = Math.max(view_size, MIN_BUFFER_PAGE) * BUFFER_PAGES

		// Portion of the initial and final scrolling to reserve for exact
		// scrolling. This affects when the scrolling is scaled down.
		const scroll_buffer = view_size + view_size * BUFFER_PAGES

		// The range for which a scroll delta is considered relative. Absolute
		// scrolling is used for large scroll jumps when using percentage.
		const relative_scroll_range = (page_buffer * 2 + view_size) * 2

		// The anchor links a position in the virtual list with a position in
		// the client view.
		//
		// The anchor position is absolute: the target of the layout run is to
		// make it so that the anchor is respected. This will usually require
		// multiple since we don't know the size of the rows until they are
		// rendered (and they can change).
		//
		// Having a stable anchor position is essential for a smooth experience
		// as the row dimensions change unpredictably and shift things around.
		let anchor = { ...window.anchor }

		// Compute the new anchor
		// ----------------------

		// Other than programatical change, user scrolling input is the only
		// thing that can change the anchor.
		//
		// We monitor the scroll position between layout runs to detect scroll
		// and update the anchor accordingly.
		if (state.scroll_to != state.scroll) {
			const target = state.scroll_to
			const scroll_delta = target - state.scroll
			console.log(`scrolling to ${state.scroll_to} from ${state.scroll} (${scroll_delta}) ~ ${root.scrollHeight}`)

			// First we determine if the scroll is absolute or relative. We
			// consider the scroll absolute if it is much larger than the page
			// size.
			if (Math.abs(scroll_delta) <= relative_scroll_range) {
				// For relative scrolling we just adjust the anchor by the
				// given delta. This ensures smooth scrolling.
				anchor.row_offset = (anchor.row_offset || 0) + (anchor.row_target == 'bottom' ? -1 : +1) * scroll_delta
			} else {
				// For absolute scrolling we consider the portion near the
				// top and bottom as exact scrolling and other portions of the
				// scrollbar as the relative position.
				const max_scroll = root.scrollHeight - root.clientHeight
				if (target <= scroll_buffer) {
					anchor = { row_index: 0, row_offset: target }
				} else if (target >= max_scroll - scroll_buffer) {
					anchor = {
						row_index: count - 1,
						row_offset: 0,
						row_target: 'bottom',
						view_target: 'bottom',
						view_offset: max_scroll - target,
					}
				} else {
					// Convert the scroll coordinates to the layout coordinates
					const pos =
						scroll_buffer +
						((target - scroll_buffer) / (max_scroll - scroll_buffer * 2)) * (full_size - scroll_buffer * 2)
					const [row_index, row_offset] = layout.row_at(pos)
					anchor = {
						row_index,
						row_offset,
					}
				}
			}

			window.anchor = anchor
		}

		// Compute the new layout
		// ----------------------

		const t1 = now()

		// The target anchor position is the estimated absolute pixel offset of
		// the anchor within the virtual list of items.
		const target_anchor =
			layout.range_height(0, anchor.row_index) +
			(anchor.row_target == 'bottom'
				? layout.row_height(anchor.row_index) - (anchor.row_offset || 0)
				: anchor.row_offset || 0)

		// This is the offset of the `target_anchor` within the view.
		const view_offset =
			anchor.view_target == 'bottom' ? view_size - (anchor.view_offset || 0) : anchor.view_offset || 0

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
		const direct_scroll = full_size <= MAX_SCROLL_HEIGHT

		// Actual scroll height to be applied to the scroller element.
		const scroll_height = direct_scroll ? full_size : MAX_SCROLL_HEIGHT

		// The target scroll position considering the anchor. This is in the
		// virtual list coordinates which may not correspond to the final scroll
		// due to browser limitations.
		const max_target_scroll = full_size - view_size
		const target_scroll = Math.min(Math.max(0, target_anchor - view_offset), max_target_scroll)

		// The actual scroll position to apply to `scrollTop`
		const scroll_position = direct_scroll
			? target_scroll
			: (() => {
					// Compute percentage scrolling if our height exceeds the browser
					// limits.

					// If our rendered range is at the start or end of the list,
					// we must ensure that the scroll offset to the list bounds
					// is the actual one.
					if (target_scroll <= relative_scroll_range) {
						return target_scroll
					}
					if (target_scroll >= full_size - relative_scroll_range - view_size) {
						return scroll_height - (full_size - target_scroll)
					}

					// Even if we are not rendering the list bounds, if we are
					// close enough to it we must ensure that the we have enough
					// scroll offset to allow scrolling up or down.
					//
					// This is the amount of scroll offset we will always keep
					// at both ends of the scroll bar.
					const min_scroll = scroll_buffer
					const max_scroll = scroll_height - min_scroll

					// Compute the scroll percentage coordinates
					const percent_scroll = (target_scroll / full_size) * scroll_height
					return Math.max(Math.min(percent_scroll, max_scroll), min_scroll)
			  })()

		// Compute the current visible range to be rendered in the list view,
		// including the buffer zone, based on the above offsets:

		// Absolute coordinates of the target rendered range, including buffer.
		const y0 = target_scroll - page_buffer

		// Row index of the of the target render range.
		const [y0_index] = layout.row_at(y0)

		// Make sure the start/end indexes are a valid range. Note that `end` is
		// exclusive.
		const sta = Math.max(0, y0_index)

		// Compute the end of render range after the start so we properly
		// consider clipping.
		const y1 = target_scroll + view_size + page_buffer
		const [y1_index] = layout.row_at(y1)
		const end = y0_index < 0 ? 0 : y1_index < 0 ? count : Math.min(count, y1_index + 1)

		// Compute the actual offset for the target rendered range.
		const sta_offset = scroll_position + view_offset - (target_anchor - layout.range_height(0, sta))

		// Recompute the anchor to be appropriate for the current position
		if (anchor.view_target != 'bottom') {
			const pos = target_anchor - view_offset
			const [row, off] = layout.row_at(pos)
			anchor = {
				row_index: row,
				row_offset: off,
			}
			window.anchor = anchor
		}

		const d1 = now() - t1
		if (d1 > 5) {
			log.push(`calc=${duration(d1)}`)
		}

		// Apply the layout
		// ----------------

		scroll.style.height = `${scroll_height}px`
		root.scrollTop = scroll_position

		// We want sub-pixel scrolling even if the scrollbar coordinates are
		// integers. We compute the difference and apply it to the view element
		// using a translate transform.
		const scroll_error = root.scrollTop - scroll_position

		const new_offset = sta_offset + scroll_error // offset from the non-rendered virtual items

		// The view element only renders the visible range, so we need to offset
		// it in the parent element to simulate its relative position.
		view.style.transform = `translateY(${new_offset}px)`

		// Update the rendered range.
		const t2 = now()

		if (sta != range.sta || end != range.end) {
			set_range({ sta, end })
		}

		const d2 = now() - t2
		if (d2 > 5) {
			log.push(`render=${duration(d2)} (${sta}-${end} ~ ${y0}=${y0_index}, ${y1}=${y1_index})`)
		}

		// Save the current scroll position so that we can detect user
		// scrolling.
		state.scroll = root.scrollTop
		state.scroll_to = root.scrollTop

		const delta = now() - start
		if (delta > 5) {
			log.push(`Δ=${duration(delta)}`)
		}

		if (log.length) {
			console.log(log.join(' / '))
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
		<div
			className="list-root"
			ref={el_root}
			tabIndex={1}
			onScroll={(ev) => {
				const pos = (ev.target as HTMLDivElement).scrollTop
				console.log('EV', pos)
				state.scroll_to = pos
			}}
		>
			<div className="list-scroller" ref={el_scroll}></div>
			<div className="list-view" ref={el_view}>
				{(console.log('R', range.sta, range.end), Range(range.sta, range.end)).map((n) => (
					<div className="list-row" data-index={n} key={n}>
						{item(n)}
					</div>
				))}
			</div>
		</div>
	)
}

export default List
