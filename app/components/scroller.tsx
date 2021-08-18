import React from 'react'

import './scroller.scss'

/**
 * Arguments for the scroller renderer function.
 */
export type ScrollerInfo = {
	readonly sender: Scroller

	/**
	 * Offset for the rendered content.
	 *
	 * This defaults to zero and can be set by the renderer to offset the
	 * position of the content within the virtual scroll height.
	 *
	 * The purpose of `offset` is to allow the renderer to render just a
	 * visible subset of the content and offset it to its would be position.
	 */
	offset: number

	/**
	 * Total scrolling height. This must be set by the renderer to the estimated
	 * or calculated height of the content.
	 */
	height: number

	/**
	 * Current scroll position.
	 *
	 * This changes with the user scrolling input, but can also be set by the
	 * renderer to force a specific scroll position.
	 *
	 * Note that the scroll position is always clamped to a valid range.
	 */
	scroll: number

	/**
	 * Scroll position after the last render call.
	 *
	 * The delta from `scroll_last` to `scroll` provides the amount of user
	 * scrolling.
	 */
	readonly scroll_last: number

	/** Client width. This is the width of the scroller viewport. */
	readonly client_width: number

	/** Client height. This is the height of the scroller viewport. */
	readonly client_height: number
}

/** Minimum thumb size. */
const MIN_THUMB_SIZE = 16

/**
 * Maximum "real" scroll height used by the virtual scroller.
 *
 * When rendering anything above this height the scroller will render this
 * subset of the scroll surface centralized around the scroll position.
 *
 * Note that while the user is scrolling the view is not re-centered, so this
 * must be large enough to make unlikely for the user to scroll to the border
 * (in which case the scroll will just stop until the view re-centers).
 */
const MAX_SCROLL_HEIGHT = 300_000

/** CSS class for a visible scroll indicator. */
const INDICATOR_ACTIVE_CLS = 'active'

type ScrollerProps = {
	/**
	 * Render function for the content. This is called for the initial render
	 * and whenever the scroll position or viewport size changes.
	 *
	 * The render must set the total `height` for the content and return the
	 * rendered content given the current parameters.
	 *
	 * The renderer can also set a `offset` for the rendered content. This is
	 * useful for rendering a subset of the scroller content and moving it
	 * into position.
	 *
	 * Additionally, the renderer may also modify the `scroll` position. The
	 * resulting scroll is clamped to a valid range.
	 */
	render: (info: ScrollerInfo) => React.ReactElement
}

/**
 * This component provides an infinite scroller surface and a custom scrollbar
 * for supporting virtual scrolling.
 */
class Scroller extends React.Component<ScrollerProps> {
	constructor(props: ScrollerProps) {
		super(props)
	}

	/**
	 * The root element for the scroller. This may be null before the first
	 * rendering.
	 */
	get el() {
		return this._el_root.current as HTMLElement
	}

	//------------------------------------------------------------------------//
	// Layout
	//------------------------------------------------------------------------//

	private _height = 0
	private _offset = 0

	/**
	 * Last computed height.
	 */
	get height() {
		return this._height
	}

	//----[ Measures ]--------------------------------------------------------//

	/**
	 * Client size for the scroller viewport.
	 */
	get client_size() {
		const root = this._el_root.current
		const rect = root?.getBoundingClientRect()
		return { width: rect?.width || 0, height: rect?.height || 0 }
	}

	/**
	 * Client height for the scroller viewport (i.e. `client_size.height`).
	 */
	get client_height() {
		return this.client_size.height
	}

	/** Current height of the scroll indicator thumb. */
	private get thumb_height() {
		return this._el_thumb.current?.getBoundingClientRect().height || 0
	}

	//----[ Scrolling ]-------------------------------------------------------//

	private _scrolling = false

	/**
	 * Returns true if the user is actively scrolling the scroller.
	 */
	get scrolling() {
		return this._scrolling
	}

	private set scrolling(value: boolean) {
		if (value != this._scrolling) {
			this._scrolling = value

			// we need to re-center the scroll position when the user stops
			// scrolling.
			this.layout()
		}
	}

	/**
	 * Maximum valid scroll position.
	 */
	get scroll_max() {
		return Math.max(0, this._height - this.client_height)
	}

	get scroll() {
		const value = this.scroll_top + this._offset
		const scroll_max = this.scroll_max

		// Snap when there is less than a pixel to the edge to round off
		// accumulated errors.
		if (value < 1) {
			return 0
		} else if (value > scroll_max - 1) {
			return scroll_max
		}

		return value
	}

	/**
	 * Virtual scroll position. This is clamped to a valid range.
	 */
	set scroll(value: number) {
		const target = Math.max(0, Math.min(this.scroll_max, value))

		if (target == this.scroll) {
			return
		}

		if (this._height < MAX_SCROLL_HEIGHT) {
			this._offset = 0
			this.scroll_top = target
		} else {
			this._offset = target - this.scroll_top
		}
		this.layout()
	}

	private get scroll_top() {
		return this._el_scroll_main.current?.scrollTop || 0
	}

	/**
	 * Actual scroll position of the internal scroller element.
	 */
	private set scroll_top(value: number) {
		const scrollable = this._el_scroll_main.current
		if (scrollable) {
			scrollable.scrollTop = value
		}
	}

	//------------------------------------------------------------------------//
	// Rendering
	//------------------------------------------------------------------------//

	/**
	 * Forces a layout run and rendering.
	 */
	layout() {
		this.forceUpdate()
	}

	private _el_root = React.createRef<HTMLDivElement>()
	private _el_scroll_main = React.createRef<HTMLDivElement>()
	private _el_scroll_inner = React.createRef<HTMLDivElement>()
	private _el_content = React.createRef<HTMLDivElement>()
	private _el_indicator = React.createRef<HTMLDivElement>()
	private _el_thumb = React.createRef<HTMLDivElement>()

	private _scroll_last = 0

	render() {
		const client = this.client_size

		// First we call the renderer to get the scroller content and height.
		const info: ScrollerInfo = {
			sender: this,
			offset: 0,
			height: this._height,
			scroll: this.scroll,
			scroll_last: this._scroll_last,
			client_width: client.width,
			client_height: client.height,
		}
		const children = this.props.render(info)

		// Update the scroll parameters
		const height = Math.max(0, info.height)
		this._height = height

		const scroll_max = Math.max(0, height - this.client_height)
		const scroll = Math.max(0, Math.min(scroll_max, info.scroll))
		this._scroll_last = scroll

		// Scroll indicator parameters
		const thumb_height = Math.min(client.height, Math.max(MIN_THUMB_SIZE, (client.height / height) * client.height))
		const thumb_pos = (scroll / scroll_max) * (client.height - thumb_height)

		// The actual scroller height. We limit this to avoid running into the
		// browser limitations.
		const actual_height = Math.min(MAX_SCROLL_HEIGHT, Math.max(0, height))

		// When the total scroll height is more than the maximum we render a
		// window centered around the scroll position. When the user is not
		// actively scrolling, we reset the `scrollTop` of the scrollable
		// element to maintain scrolling space.
		if (actual_height < height && !this.scrolling) {
			const max_offset = height - actual_height

			// Compute a "window" around the scroll position to render with the
			// available height. This is the top offset of the scroll window.
			const base_offset = Math.max(0, Math.min(max_offset, scroll - (actual_height - client.height) / 2))

			// Compute the scroll_top position for the base offset. This will
			// usually keep the actual `scrollTop` centered, unless we are close
			// to a border.
			this.scroll_top = scroll - base_offset
			this._last_scroll = this.scroll_top
		}

		// Recompute the base offset because desktop browser may round
		// the `scrollTop` value.
		this._offset = scroll - this.scroll_top

		// This is the offset for the rendered content taking into account the
		// offset set by the renderer.
		const offset = info.offset - this._offset

		// Render hierarchy:
		//
		// `scroller-root` is the main container. It contains the scrollable
		// surface and the scrollbar/scroll indicator.
		//
		// `scroller-scroll-main` is the actual scrollable surface. It occupies
		// the same size as the root and provides the (hidden) browser scroll.
		//
		// `scroller-scroll-inner` provides the rendered scroll height and
		// contains the content. This has `overflow: hidden` to prevent the
		// rendered content from spilling out.
		//
		// `scroller-scroll-content` wraps the rendered content. This is offset
		// using `translateY` according to the offset provided by the renderer.
		//
		// `scroller-indicator` and `scroller-thumb` implement the scrollbar.
		// Those are overlaid on top of the content, and is usually hidden
		// unless the user is scrolling.
		return (
			<div ref={this._el_root} className="scroller-root">
				<div
					ref={this._el_scroll_main}
					className="scroller-scroll-main"
					onScroll={() => this.handle_scroll()}
					onKeyDown={(ev) => this.handle_keydown(ev)}
				>
					<div
						ref={this._el_scroll_inner}
						className="scroller-scroll-inner"
						style={{ height: `${actual_height}px` }}
						tabIndex={0}
					>
						<div
							ref={this._el_content}
							className="scroller-scroll-content"
							style={{ transform: `translateY(${offset}px)` }}
						>
							{children}
						</div>
					</div>
				</div>
				<div
					ref={this._el_indicator}
					className="scroller-indicator"
					onMouseDown={(ev) => this.handle_indicator_mousedown(ev)}
					style={{ display: scroll_max > 0 ? undefined : 'none' }}
				>
					<div
						ref={this._el_thumb}
						className="scroller-thumb"
						style={{ height: `${thumb_height}px`, top: `${thumb_pos}px` }}
					></div>
				</div>
			</div>
		)
	}

	//------------------------------------------------------------------------//
	// Event handlers
	//------------------------------------------------------------------------//

	//----[ Lifetime ]--------------------------------------------------------//

	readonly cleanup: Array<() => void> = []

	private _watcher = -1

	componentDidMount() {
		// Flash the scroll indicator when the component mounts.
		this.show_scroll_indicator(1000)

		//----[ Global mouse handlers ]---------------------------------------//

		// Add global mouse listeners to handle scrollbar mouse dragging. We
		// need them at the document level to allow dragging from outside the
		// scroll indicator.
		const mousemove = this.handle_indicator_mousemove.bind(this)
		const mouseup = this.handle_indicator_mouseup.bind(this)
		document.addEventListener('mousemove', mousemove)
		document.addEventListener('mouseup', mouseup)
		this.cleanup.push(() => {
			document.removeEventListener('mousemove', mousemove)
			document.removeEventListener('mouseup', mouseup)
		})

		//----[ Watch for resizing ]------------------------------------------//

		const me = this
		let last_w = -1
		let last_h = -1
		function watch_size() {
			try {
				const client = me.client_size
				if (client.width != last_w || client.height != last_h) {
					last_w = client.width
					last_h = client.height
					me.layout()
				}
			} finally {
				me._watcher = requestAnimationFrame(watch_size)
			}
		}

		watch_size()
		this.cleanup.push(() => cancelAnimationFrame(this._watcher))
	}

	componentWillUnmount() {
		// Run all the registered cleanup functions.
		this.cleanup.forEach((cleanup) => cleanup())
	}

	//----[ Keyboard ]--------------------------------------------------------//

	handle_keydown(ev: React.KeyboardEvent) {
		// We need to handle home/end specially because of the virtual
		// scrolling.
		let cancel = false
		switch (ev.key) {
			case 'Home':
				this.scroll = 0
				cancel = true
				break
			case 'End':
				this.scroll = this.scroll_max
				cancel = true
				break
		}
		if (cancel) {
			ev.preventDefault()
			ev.stopPropagation()
		}
	}

	//----[ Scrolling ]-------------------------------------------------------//

	private _last_scroll = -1
	private _scroll_timeout = -1

	/** Handle scroll events from the scrollable div. */
	handle_scroll() {
		// Show the scroll indicator during scrolling.
		this.show_scroll_indicator(500)

		const scroll_top = this.scroll_top
		if (scroll_top != this._last_scroll) {
			// Handle the scrolling flag. We use this to avoid messing up with
			// the `scroll_top` while the user is actively scrolling.
			this.scrolling = true
			clearTimeout(this._scroll_timeout)
			this._scroll_timeout = (setTimeout(() => (this.scrolling = false), 100) as unknown) as number

			this._last_scroll = scroll_top
			this.layout()
		}
	}

	private readonly _indicator = {
		active: false,
		offset: 0,
		anchor: 0,
	}

	/**
	 * Handle mousedown on the scroll indicator track. This starts the drag
	 * scrolling operation.
	 */
	handle_indicator_mousedown(ev: React.MouseEvent) {
		ev.preventDefault()
		ev.stopPropagation()

		const target = ev.target as HTMLElement
		const indicator = this._el_indicator.current!
		const is_indicator = target == indicator

		const thumb_height = this.thumb_height
		const offset = ev.clientY - indicator.getBoundingClientRect().top - (is_indicator ? thumb_height / 2 : 0)

		if (is_indicator) {
			const client_height = this.client_height
			this.scroll = Math.round((offset / (client_height - thumb_height)) * this.scroll_max)
		}

		const scroll = this._indicator
		scroll.active = true
		scroll.offset = ev.clientY
		scroll.anchor = this.scroll
		this.show_scroll_indicator(0)
	}

	/**
	 * Handle mousemove for the scroll indicator scrolling. This is registered
	 * at the document level.
	 */
	handle_indicator_mousemove(ev: MouseEvent) {
		const scroll = this._indicator
		if (scroll.active) {
			const thumb_height = this.thumb_height
			const client_max = this.client_height - thumb_height
			const delta = ev.clientY - scroll.offset
			this.scroll = Math.round(scroll.anchor + delta * (this.scroll_max / client_max))
		}
	}

	/**
	 * Handle mouse for the scroll indicator scrolling. This is registered
	 * at the document level.
	 */
	handle_indicator_mouseup() {
		if (this._indicator.active) {
			this._indicator.active = false
			this.hide_scroll_indicator()
		}
	}

	//------------------------------------------------------------------------//
	// Private
	//------------------------------------------------------------------------//

	private _indicator_timeout = 0

	private show_scroll_indicator(timeout = 0) {
		clearTimeout(this._indicator_timeout)

		const indicator = this._el_indicator.current
		if (indicator) {
			indicator.classList.add(INDICATOR_ACTIVE_CLS)
			if (timeout > 0 && !this._indicator.active) {
				this._indicator_timeout = (setTimeout(() => this.hide_scroll_indicator(), timeout) as unknown) as number
			}
		}
	}

	private hide_scroll_indicator() {
		clearTimeout(this._indicator_timeout)
		const indicator = this._el_indicator.current
		if (indicator) {
			indicator.classList.remove(INDICATOR_ACTIVE_CLS)
		}
	}
}

export default Scroller
