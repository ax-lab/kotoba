import {
	EventHistoryChange,
	EventRemoteInput,
	EventSubtitleChange,
	EventVideoPlayback,
	ServerEvent,
} from '../../lib-ts'

export type EventCallback = (data: ServerEvent) => void

const WARN_DURATION = 100
const WARN_THROTTLE = 500

type EventHandlerQueue = {
	/**
	 * This is true if the handler is still running. We use that to throttle
	 * events. Note that all but the last blocked events are dropped.
	 */
	blocked?: boolean

	/** This is the last event that arrived during a blocked handler. */
	next_event?: ServerEvent

	last_warning: number
	total_time: number
	total_count: number
	lost_events: number
	warn_throttle: number
}

class EventHandler {
	/** Name for the handler. Used only for debugging. */
	readonly name: string

	/** Event callback */
	private callback: EventCallback

	constructor(name: string, callback: EventCallback) {
		this.name = name
		this.callback = callback
	}

	// Mantain a separate queue for each event, so different types don't block
	// each other.
	private queue = new Map<string, EventHandlerQueue>()

	private queue_by_event(type: string) {
		let it = this.queue.get(type)
		if (!it) {
			it = {
				last_warning: 0,
				total_time: 0,
				total_count: 0,
				lost_events: 0,
				warn_throttle: WARN_THROTTLE,
			}
			this.queue.set(type, it)
		}
		return it
	}

	/**
	 * Run the event handler asynchronously. This prevents blocking the event
	 * handling for misbehaved handlers.
	 */
	run_async(event: ServerEvent) {
		const q = this.queue_by_event(event.type)

		// Don't run the handler if the previous call did not finish.
		if (q.blocked) {
			q.next_event && (q.lost_events += 1)
			// Save the last event to generate a new call.
			q.next_event = event
			return
		}

		q.blocked = true
		setTimeout(() => {
			try {
				this.run(q, event)
			} finally {
				const ev = q.next_event
				q.blocked = false
				q.next_event = undefined
				if (ev) {
					this.run_async(ev)
				}
			}
		})
	}

	/** Run the event handler synchronously. */
	private run(q: EventHandlerQueue, event: ServerEvent) {
		const header = `${event.type} - ${this.name}`
		const sta = Date.now()
		try {
			this.callback(event)
		} catch (err) {
			console.error(`in ${header}:`, err)
		}
		const end = Date.now()
		const dur = end - sta

		// compute the average handler timing
		q.total_count++
		q.total_time += dur

		// if a handler takes too long, generate a warning in the console
		const last_warn = end - q.last_warning
		if (dur > WARN_DURATION && last_warn >= q.warn_throttle) {
			const avg = (q.total_time / q.total_count).toFixed(0)
			console.warn(
				`${header} handler took ${dur.toFixed(0)}ms (average is ${avg}ms in ${q.total_count} runs - ${
					q.lost_events
				} lost)`,
			)

			// increase or decrease the throttle delay to avoid console spam
			const delta = -(last_warn - 2 * WARN_THROTTLE) / 10
			q.warn_throttle = Math.round(Math.min(WARN_THROTTLE, q.warn_throttle + delta))
			q.last_warning = end
		}
	}
}

/**
 * Server side event handling.
 */
class Events {
	constructor() {
		const source = new EventSource('/api/events')
		source.onmessage = (ev) => {
			const data = JSON.parse(ev.data) as ServerEvent
			for (const handler of this._handlers.values()) {
				handler.run_async(data)
			}
		}

		this.watch_playback('global', (ev) => {
			this._current_playback = ev
		})
		this.watch_subtitle('global', (ev) => {
			this._current_subtitle = ev
		})
	}

	private _handlerID = 0
	private _handlers = new Map<number, EventHandler>()

	/**
	 * Register an event handler for server events.
	 *
	 * This returns a function that when called will unregister the handler.
	 */
	register(name: string, callback: EventCallback) {
		const id = ++this._handlerID
		this._handlers.set(id, new EventHandler(name, callback))
		return () => {
			this._handlers.delete(id)
		}
	}

	private _current_playback?: EventVideoPlayback

	get current_playback() {
		return this._current_playback
	}

	private _current_subtitle?: EventSubtitleChange

	get current_subtitle() {
		return this._current_subtitle
	}

	watch_playback(name: string, callback: (ev: EventVideoPlayback) => void) {
		return this.register(name, (ev) => {
			if (ev.type == 'video-playback') {
				callback(ev)
			}
		})
	}

	watch_subtitle(name: string, callback: (ev: EventSubtitleChange) => void) {
		return this.register(name, (ev) => {
			if (ev.type == 'subtitle-change') {
				callback(ev)
			}
		})
	}

	watch_remote_input(name: string, callback: (ev: EventRemoteInput) => void) {
		return this.register(name, (ev) => {
			if (ev.type == 'remote-input') {
				callback(ev)
			}
		})
	}

	watch_history_change(name: string, callback: (ev: EventHistoryChange) => void) {
		return this.register(name, (ev) => {
			if (ev.type == 'history-change') {
				callback(ev)
			}
		})
	}
}

/** Instance of Events for handling server-side events. */
export const events = new Events()
