/**
 * Interface for a generic event.
 */
export interface Event {
	/** Type for this event. */
	type: string
	[key: string]: unknown
}

/**
 * Server side event management. Events are posted globally and can be read
 * by clients by opening the `text/event-stream` API endpoint.
 */
class Dispatcher {
	private handlers: Array<(event: Event) => void> = []

	post<T extends Event>(event: T) {
		this.handlers.forEach((fn) => fn(event))
	}

	handle(handler: (event: Event) => void) {
		this.handlers.push(handler)
	}
}

export const event = new Dispatcher()
