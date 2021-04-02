export type EventCallback = (data: unknown) => void

export class Events {
	private constructor() {
		const source = new EventSource('/api/events')
		source.onmessage = (ev) => {
			const data = JSON.parse(ev.data) as unknown
			this._callbacks.forEach((fn) => fn(data))
		}
	}

	static _instance = new Events()

	static get() {
		return this._instance
	}

	_callbacks: EventCallback[] = []

	register(callback: EventCallback) {
		this._callbacks.push(callback)
	}
}
