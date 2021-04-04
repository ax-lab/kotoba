import { ServerEvent } from '../lib'

/**
 * Server side event management. Events are posted globally and can be read
 * by clients by opening the `text/event-stream` API endpoint.
 */
class Dispatcher {
	private handlers: Array<(event: ServerEvent) => void> = []

	post<T extends ServerEvent>(event: T) {
		this.handlers.forEach((fn) => fn(event))
	}

	handle(handler: (event: ServerEvent) => void) {
		this.handlers.push(handler)
	}
}

export const events = new Dispatcher()
