import React, { useEffect } from 'react'

import './splitter.scss'

import State from '../util/state'

/** Stored state for a registered splitter. */
type SplitState = {
	name: string
	element: HTMLDivElement

	// All fields below are set on drag start (mousedown on the splitter)

	startX?: number // Initial mouse position for the drag (page coordinates)
	startY?: number // Initial mouse position for the drag (page coordinates)
	prev?: HTMLElement // Previous sibling (left)
	next?: HTMLElement // Next sibling (right)
	prevWidth?: number // Starting width for the previous sibling
	nextWidth?: number // Starting width for the next sibling
}

/**
 * Manages all splitters on the page.
 */
class SplitterManager {
	constructor() {
		document.addEventListener('mousemove', (ev) => {
			// If there is any active splitter, request a layout run in the next
			// animation frame.
			this.mouseX = ev.pageX
			this.mouseY = ev.pageY
			if (this.active.length) {
				if (this.animationFrame != null) {
					cancelAnimationFrame(this.animationFrame)
				}
				this.animationFrame = requestAnimationFrame(() => this.layout())
			}
		})

		document.addEventListener('mouseup', () => {
			// Stop all active splitters
			this.active.length = 0
		})
	}

	// Map of registered splitters
	private map = new Map<string, SplitState>()

	// List of active (being dragged splitters)
	private active: Array<SplitState> = []

	// Last mouse position (from mousemove)
	private mouseX = 0
	private mouseY = 0

	// Next requested animation frame
	private animationFrame?: number

	/**
	 * Register a splitter element. This should be called on the initial
	 * rendering of the element.
	 */
	register(element: HTMLDivElement, name: string) {
		this.map.set(name, {
			name: name,
			element: element,
		})

		// Restore the saved siblings size if any.
		const target = State.get(`split-${name}`, { prev: 0, next: 0 })
		if (target.prev + target.next && element) {
			const prev = element.previousElementSibling as HTMLElement
			const next = element.nextElementSibling as HTMLElement
			if (prev && next) {
				this.setSize(prev, target.prev, next, target.next)
			}
		}

		return () => this.map.delete(name)
	}

	/**
	 * Start moving the splitter. This is called by the `mousedown` event
	 * on the splitter element. The params `x` and `y` are page coordinates.
	 */
	start(name: string, x: number, y: number) {
		const state = this.map.get(name)
		if (!state || !state.element) {
			return
		}

		// Start dragging position for this splitter. Used to compute the drag
		// offsets on mousemove
		state.startX = x
		state.startY = y

		// Store the sibling elements.
		state.prev = state.element.previousElementSibling as HTMLElement
		state.next = state.element.nextElementSibling as HTMLElement
		if (!state.prev || !state.next) {
			return
		}

		// Store the base size of the elements.
		state.prevWidth = state.prev.getBoundingClientRect().width
		state.nextWidth = state.next.getBoundingClientRect().width

		// Add the splitter to the list of active splitters. Those are updated
		// by the `mousemove` handler on the document.
		this.active = this.active.filter((x) => x === state)
		this.active.push(state)
	}

	/**
	 * Update the size of all active splitters. This is called inside an
	 * animation frame.
	 */
	private layout() {
		for (const it of this.active) {
			const prev = it.prev!
			const next = it.next!
			const offset = this.mouseX - it.startX!

			// compute the target widths
			const prevTarget = it.prevWidth! + offset
			const nextTarget = it.nextWidth! - offset

			this.setSize(prev, prevTarget, next, nextTarget)

			State.set(`split-${it.name}`, { prev: prevTarget, next: nextTarget })
		}
	}

	/**
	 * Set the target size of the splitter siblings.
	 */
	private setSize(prev: HTMLElement, prevTarget: number, next: HTMLElement, nextTarget: number) {
		prev.style.flexGrow = prevTarget.toString()
		next.style.flexGrow = nextTarget.toString()
		prev.style.flexBasis = '1px'
		next.style.flexBasis = '1px'
	}
}

const manager = new SplitterManager()

/**
 * Vertical splitter component.
 *
 * This needs be positioned between two elements in a flexbox container, no
 * other setup is necessary.
 *
 * This component allows the user to resize its two siblings by draging the
 * splitter. It will also automatically save and restore the sizes using the
 * application state.
 */
const Splitter = ({ name }: { name: string }) => {
	const el = React.createRef<HTMLDivElement>()
	useEffect(() => {
		const cleanup = manager.register(el.current!, name)
		return () => {
			cleanup()
		}
	}, [])
	return (
		<>
			<div
				ref={el}
				className="vertical-splitter"
				onMouseDown={(ev) => {
					ev.preventDefault()
					ev.stopPropagation()
					manager.start(name, ev.pageX, ev.pageY)
				}}
			>
				&nbsp;
			</div>
		</>
	)
}

export default Splitter
