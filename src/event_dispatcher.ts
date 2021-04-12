import { ServerEvent } from '../lib'

/**
 * Server side event management. Events are posted globally and can be read
 * by clients by opening the `text/event-stream` API endpoint.
 */
class Dispatcher {
	private handlers: Array<(event: ServerEvent) => void> = []
	private initializers: Array<() => (ServerEvent | undefined)[] | ServerEvent | undefined> = []

	post<T extends ServerEvent>(event: T) {
		this.handlers.forEach((fn) => fn(event))
	}

	handle(handler: (event: ServerEvent) => void) {
		this.handlers.push(handler)
	}

	/**
	 * Register an initializer responsible for returning "current state" events
	 * to provide in a snapshot.
	 */
	add_initializer(init: () => ServerEvent[] | ServerEvent | undefined) {
		this.initializers.push(init)
	}

	/**
	 * Snapshot returns a list of events to initialize the current application
	 * state from scratch.
	 */
	get_snapshot() {
		const out: ServerEvent[] = []
		for (const fn of this.initializers) {
			const ev = fn()
			if (ev) {
				if (Array.isArray(ev)) {
					for (const it of ev) {
						it && out.push(it)
					}
				} else {
					out.push(ev)
				}
			}
		}
		return out
	}
}

export const server_events = new Dispatcher()
