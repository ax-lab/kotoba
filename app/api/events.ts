import { ServerEvent } from '../../lib'

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
}

/** Instance of Events for handling server-side events. */
export const events = new Events()
