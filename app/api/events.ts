import { EventVideoPlayback, ServerEvent } from '../../lib'

export type EventCallback = (data: ServerEvent) => void

/**
 * Server side event handling.
 */
class Events {
	constructor() {
		const source = new EventSource('/api/events')
		source.onmessage = (ev) => {
			const data = JSON.parse(ev.data) as ServerEvent
			for (const handler of this._handlers.values()) {
				handler(data)
			}
		}

		this.watch_playback((ev) => {
			this._current_playback = ev
		})
	}

	private _handlerID = 0
	private _handlers = new Map<number, EventCallback>()

	/**
	 * Register an event handler for server events.
	 *
	 * This returns a function that when called will unregister the handler.
	 */
	register(callback: EventCallback) {
		const id = ++this._handlerID
		this._handlers.set(id, callback)
		return () => {
			this._handlers.delete(id)
		}
	}

	private _current_playback?: EventVideoPlayback

	get current_playback() {
		return this._current_playback
	}

	watch_playback(callback: (ev: EventVideoPlayback) => void) {
		return this.register((ev) => {
			if (ev.type == 'video-playback') {
				callback(ev)
			}
		})
	}
}

/** Instance of Events for handling server-side events. */
export const events = new Events()
