import React from 'react'

import './scroller.scss'

/**
 * Arguments for the scroller renderer function.
 */
type ScrollerInfo = {
	/**
	 * Set the offset for the rendered content. This can be set by the renderer.
	 */
	offset: number

	/** Total scrolling height. */
	readonly height: number

	/** Current scroll position. */
	readonly scroll: number

	/** Client width. */
	readonly client_width: number

	/** Client height. */
	readonly client_height: number
}

const MIN_THUMB_SIZE = 16
const MAX_SCROLL_HEIGHT = 300_000

const INDICATOR_ACTIVE_CLS = 'active'

type ScrollerProps = {
	/**
	 * Size of the scrollable content.
	 */
	height: number

	/**
	 * Render function for the content. This is called whenever the scroll
	 * position and other layout parameters change.
	 *
	 * Besides returning the content the render function can set the `offset`
	 * value in info to offset the content based on the virtual scrolling
	 * position.
	 */
	render: (info: ScrollerInfo) => React.ReactElement
}

/**
 * Infinite scroller. Provides an infinite vertical scrolling surface and
 * specific support for virtual scrolling.
 */
class Scroller extends React.Component<ScrollerProps> {
	constructor(props: ScrollerProps) {
		super(props)
	}

	//------------------------------------------------------------------------//
	// Layout
	//------------------------------------------------------------------------//

	//----[ Measures ]--------------------------------------------------------//

	get height() {
		return this.props.height
	}

	get client_size() {
		const root = this.el_root.current
		const rect = root?.getBoundingClientRect()
		return { width: rect?.width || 0, height: rect?.height || 0 }
	}

	get client_height() {
		return this.client_size.height
	}

	private get thumb_height() {
		return this.el_thumb.current?.getBoundingClientRect().height || 0
	}

	private get scroll_max() {
		return this.height - this.client_height
	}

	//----[ Scrolling ]-------------------------------------------------------//

	private _scrolling = false

	get scrolling() {
		return this._scrolling
	}

	private set scrolling(value: boolean) {
		if (value != this._scrolling) {
			this._scrolling = value
			this.layout()
		}
	}

	private _offset = 0

	get scroll() {
		return this.scroll_top + this._offset
	}

	set scroll(value: number) {
		const target = Math.max(0, Math.min(this.scroll_max, value))

		if (target == this.scroll) {
			return
		}

		if (this.height < MAX_SCROLL_HEIGHT) {
			this._offset = 0
			this.scroll_top = target
		} else {
			this._offset = target - this.scroll_top
		}
		this.layout()
	}

	private get scroll_top() {
		return this.el_scroll_main.current?.scrollTop || 0
	}

	private set scroll_top(value: number) {
		const scrollable = this.el_scroll_main.current
		if (scrollable) {
			scrollable.scrollTop = value
		}
	}

	//------------------------------------------------------------------------//
	// Rendering
	//------------------------------------------------------------------------//

	layout() {
		this.forceUpdate()
	}

	private el_root = React.createRef<HTMLDivElement>()
	private el_scroll_main = React.createRef<HTMLDivElement>()
	private el_scroll_inner = React.createRef<HTMLDivElement>()
	private el_content = React.createRef<HTMLDivElement>()
	private el_indicator = React.createRef<HTMLDivElement>()
	private el_thumb = React.createRef<HTMLDivElement>()

	render() {
		const scroll_max = this.scroll_max

		const height = this.height
		const scroll = Math.max(0, Math.min(scroll_max, this.scroll))
		const client = this.client_size

		// Render children
		const info: ScrollerInfo = {
			offset: 0,
			height,
			scroll,
			client_width: client.width,
			client_height: client.height,
		}
		const children = this.props.render(info)

		// Scroll indicator parameters
		const thumb_height = Math.min(client.height, Math.max(MIN_THUMB_SIZE, (client.height / height) * client.height))
		const thumb_pos = (scroll / scroll_max) * (client.height - thumb_height)

		const actual_height = Math.min(MAX_SCROLL_HEIGHT, Math.max(0, height))

		if (actual_height < height && !this.scrolling) {
			const max_offset = height - actual_height

			// Compute a "window" around the scroll position to render with the
			// available height. This is the top offset of the scroll window.
			const base_offset = Math.max(0, Math.min(max_offset, scroll - (actual_height - client.height) / 2))

			// Compute the scroll_top position for the base offset.
			this.scroll_top = scroll - base_offset

			// Recompute the base offset because desktop browser will round
			// the scroll top
			this._offset = scroll - this.scroll_top
		}

		const offset = info.offset - this._offset

		return (
			<div ref={this.el_root} className="scroller-root">
				<div
					ref={this.el_scroll_main}
					className="scroller-scroll-main"
					onScroll={() => this.handle_scroll()}
					onKeyDown={(ev) => this.handle_keydown(ev)}
				>
					<div
						ref={this.el_scroll_inner}
						className="scroller-scroll-inner"
						style={{ height: `${actual_height}px` }}
						tabIndex={0}
					>
						<div
							ref={this.el_content}
							className="scroller-scroll-content"
							style={{ transform: `translateY(${offset}px)` }}
						>
							{children}
						</div>
					</div>
				</div>
				<div
					ref={this.el_indicator}
					className="scroller-indicator"
					onMouseDown={(ev) => this.handle_indicator_mousedown(ev)}
					style={{ display: scroll_max > 0 ? undefined : 'none' }}
				>
					<div
						ref={this.el_thumb}
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

	watch_size_request = -1

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
				me.watch_size_request = requestAnimationFrame(watch_size)
			}
		}

		watch_size()
		this.cleanup.push(() => cancelAnimationFrame(this.watch_size_request))
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

		// Handle the scrolling flag. We use this to avoid messing up with the
		// scroll_top while the user is actively scrolling.
		this.scrolling = true
		clearTimeout(this._scroll_timeout)
		this._scroll_timeout = (setTimeout(() => (this.scrolling = false), 10) as unknown) as number

		const scroll_top = this.scroll_top
		if (scroll_top != this._last_scroll) {
			this._last_scroll = scroll_top
			this.layout()
		}
	}

	readonly indicator_scroll = {
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
		const indicator = this.el_indicator.current!
		const is_indicator = target == indicator

		const thumb_height = this.thumb_height
		const offset = ev.clientY - indicator.getBoundingClientRect().top - (is_indicator ? thumb_height / 2 : 0)

		if (is_indicator) {
			const client_height = this.client_height
			this.scroll = (offset / (client_height - thumb_height)) * this.scroll_max
		}

		const scroll = this.indicator_scroll
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
		const scroll = this.indicator_scroll
		if (scroll.active) {
			const thumb_height = this.thumb_height
			const client_max = this.client_height - thumb_height
			const delta = ev.clientY - scroll.offset
			this.scroll = scroll.anchor + delta * (this.scroll_max / client_max)
		}
	}

	/**
	 * Handle mouse for the scroll indicator scrolling. This is registered
	 * at the document level.
	 */
	handle_indicator_mouseup() {
		if (this.indicator_scroll.active) {
			this.indicator_scroll.active = false
			this.hide_scroll_indicator()
		}
	}

	//------------------------------------------------------------------------//
	// Private
	//------------------------------------------------------------------------//

	private scroll_indicator_timeout = 0

	private show_scroll_indicator(timeout = 0) {
		clearTimeout(this.scroll_indicator_timeout)

		const indicator = this.el_indicator.current
		if (indicator) {
			indicator.classList.add(INDICATOR_ACTIVE_CLS)
			if (timeout > 0 && !this.indicator_scroll.active) {
				this.scroll_indicator_timeout = (setTimeout(
					() => this.hide_scroll_indicator(),
					timeout,
				) as unknown) as number
			}
		}
	}

	private hide_scroll_indicator() {
		clearTimeout(this.scroll_indicator_timeout)
		const indicator = this.el_indicator.current
		if (indicator) {
			indicator.classList.remove(INDICATOR_ACTIVE_CLS)
		}
	}
}

export default Scroller
