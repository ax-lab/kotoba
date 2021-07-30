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
 * corresponds to the exact scrollbar position and some adjustments are made
 * to the scrolling.
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
		last_scroll: 0,
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

		// The anchor links a position in the virtual list with a position in
		// the client view. This provides a stable reference point for the
		// scrolling even as the size of the list items change.
		//
		// The anchor position is absolute for the layout. Everything is
		// computed so that the anchor is respected. This may take more than
		// one layout pass though, since the actual item sizes may be different
		// than what the layout is considering. Once an item is rendered, its
		// real size is measured and eventually the layout will converge.
		let anchor = { ...window.anchor }

		// Compute the list coordinates from the anchor.
		const compute_anchor = () => {
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
			const max_target_scroll = full_size - view_size
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
			const end = y0_index < 0 ? 0 : y1_index < 0 ? count : Math.min(count, y1_index + 1)

			return { target_scroll, sta, end, max_target_scroll }
		}

		if (full_size <= MAX_SCROLL_HEIGHT) {
			//================================================================//
			// Direct scrolling
			//================================================================//

			// We handle the easier case of the list being less than max scroll
			// size separately.

			const max_scroll = full_size - view_size

			// Apply the user scrolling to the anchor before computing the
			// layout.
			const scrolling = state.scroll_to != state.scroll
			if (scrolling) {
				// We handle scroll to top and bottom separately to make sure
				// we get proper behavior as the layout updates.
				if (state.scroll_to <= 0) {
					anchor = { row_index: 0, row_offset: 0, view_offset: 0, view_target: 'top' }
				} else if (state.scroll_to >= max_scroll) {
					anchor = {
						row_index: count,
						row_offset: 0,
						row_target: 'bottom',
						view_offset: 0,
						view_target: 'bottom',
					}
				} else {
					// For relative scrolling, we just recompute the anchor.
					const [index, offset] = state.layout.row_at(state.scroll_to)
					anchor = {
						row_index: index,
						row_offset: offset,
						view_offset: 0,
						view_target: 'top',
					}
				}
			}

			const { sta, end, target_scroll } = compute_anchor()

			// Since we are rendering just a sub-range of the list, we need to
			// offset the rows so that they appear at the correct position.
			//
			// The view element is a child of the root element, so we can just
			// ignore the scrolling and offset it by the size of the "missing"
			// non-rendered `sta` items.
			const sta_offset = layout.range_height(0, sta)

			window.anchor = anchor

			// Apply the layout
			// ----------------

			scroll.style.height = `${full_size}px`
			root.scrollTop = target_scroll

			// We want sub-pixel scrolling even if the scrollbar coordinates are
			// integers. We compute the difference and apply it to the view element
			// using a translate transform.
			const scroll_error = root.scrollTop - target_scroll

			// The view element only renders the visible range, so we need to offset
			// it in the parent element to simulate its relative position.
			view.style.transform = `translateY(${sta_offset + scroll_error}px)`

			// Update the rendered range.
			const t1 = now()

			if (sta != range.sta || end != range.end) {
				set_range({ sta, end })
			}

			const dt = now() - t1
			if (dt > 5) {
				log.push(`render=${duration(dt)} (${sta}-${end})`)
			}
		} else {
			//================================================================//
			// Scaled scrolling
			//================================================================//

			// If the list is too big it will exceed the scrollbar size limit of
			// the browser and cause all sorts of trouble.
			//
			// To avoid that we limit the maximum size of the list and scale
			// the scrolling. With scaled scrolling, we forgo using the exact
			// scroll position and instead use relative user scrolling to
			// change the position in the list. In this case, the scroll bar
			// becomes an (imprecise) indicator of the position in the list,
			// instead controlling the absolute scroll position.

			const max_scroll = MAX_SCROLL_HEIGHT - view_size

			// Apply the user scrolling to the anchor before computing the
			// layout.
			let recalculate_anchor = false

			const scrolling = state.scroll_to != state.scroll
			if (scrolling) {
				state.last_scroll = start

				// Handle the scroll to top and to bottom as separate cases.
				if (state.scroll_to <= 0) {
					anchor = { row_index: 0, row_offset: 0, view_offset: 0, view_target: 'top' }
				} else if (state.scroll_to >= max_scroll) {
					anchor = {
						row_index: count,
						row_offset: 0,
						row_target: 'bottom',
						view_offset: 0,
						view_target: 'bottom',
					}
				} else {
					// Instead of using the direct scroll position, we need
					// to use the relative delta to scroll the list, otherwise
					// we would be scaling the scrolling.
					const delta = state.scroll_to - state.scroll

					console.log(delta)
					// If the delta is really big, we jump directly to the
					// proportional list position instead of trying to scroll
					// smoothly.
					if (delta > MAX_SCROLL_HEIGHT * 0.1) {
						console.log('ABS SCROLL')
						const position = (state.scroll_to / max_scroll) * layout.height
						const [index] = layout.row_at(position)
						anchor = {
							row_index: index,
						}
					} else {
						// For smaller scroll differences, we just apply the
						// delta to the anchor.
						anchor.row_offset = (anchor.row_offset || 0) + delta

						// We want to recompute the anchor linking it to a
						// visible element. This is to avoid having it linked
						// to a distant item as the user scrolls away.
						//
						// Having a distant anchor offset makes it susceptible
						// to drifting as the rows in between are recalculated.
						recalculate_anchor = true
					}
				}
			}

			const { sta, end, target_scroll, max_target_scroll } = compute_anchor()

			// Compute the scaled scrollbar position
			// =====================================
			//
			// This does not need to be exact as we don't depend on the
			// absolute scroll position. This is mostly provided for user
			// feedback and to ensure enough spacing for the user to scroll
			// around.

			// If we are rendering at the beginning or at the end of the list,
			// we use the unscaled distance for the scrolling. Otherwise we
			// scale it. If we are scaling, we need to make sure to leave enough
			// buffer space to allow for fast scrolling up and down.
			const scroll_buffer = view_size * 10
			const min_scroll_buffer = Math.min(target_scroll, scroll_buffer)
			const max_scroll_buffer = max_scroll - Math.min(scroll_buffer, max_target_scroll - target_scroll)

			// The actual scrollbar position.
			const scaled_target_scroll =
				sta == 0
					? target_scroll
					: end == layout.count
					? max_scroll - (max_target_scroll - target_scroll)
					: Math.max(
							min_scroll_buffer,
							Math.min(max_scroll_buffer, Math.round((target_scroll / max_target_scroll) * max_scroll)),
					  )

			// Compute the offset to apply to the view so that it appears at
			// the proper position.
			const sta_offset = scaled_target_scroll - (target_scroll - layout.range_height(0, sta))

			// Re-compute the anchor if necessary
			if (recalculate_anchor) {
				const [row_index, row_offset] = layout.row_at(target_scroll)
				anchor = { row_index, row_offset }
			}

			window.anchor = anchor

			// Apply the layout
			// ----------------

			scroll.style.height = `${MAX_SCROLL_HEIGHT}px`

			// We want to delay setting scrollTop because the browser will
			// force the position while it's animating and that will cause
			// all sorts of issues with our delta.
			if (!scrolling && start - state.last_scroll > 500) {
				root.scrollTop = scaled_target_scroll
			}

			const scroll_error = root.scrollTop - scaled_target_scroll
			view.style.transform = `translateY(${sta_offset + scroll_error}px)`

			// Update the rendered range.
			const t1 = now()

			if (sta != range.sta || end != range.end) {
				set_range({ sta, end })
			}

			const dt = now() - t1
			if (dt > 5) {
				log.push(`render=${duration(dt)} (${sta}-${end})`)
			}
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
				state.scroll_to = pos
			}}
		>
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
