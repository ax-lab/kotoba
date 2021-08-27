/**
 * Simple utility class for emiting and handling events.
 */
export class EventField<T> {
	private _id = 0
	private _handlers: Array<{ id: number; fn: (args: T) => void }> = []

	on(fn: (arg: T) => void) {
		const id = ++this._id
		this._handlers.push({ id, fn })

		const unregister = () => {
			this._handlers = this._handlers.filter((x) => x.id == id)
		}
		return unregister
	}

	emit(arg: T) {
		for (const handler of this._handlers) {
			handler.fn(arg)
		}
	}
}
