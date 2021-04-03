const SAVED_STATE_KEY = 'saved-state'

type StateMap = { [key: string]: unknown }

class State {
	private values: StateMap = {}

	constructor() {
		try {
			this.values = JSON.parse(window.localStorage[SAVED_STATE_KEY]) as StateMap
		} catch (e) {
			// ignore any errors
		}
		this.values = this.values || {}
	}

	/**
	 * Gets a value from the persistent storage. Returns `defaultValue` if not
	 * found.
	 */
	get<T>(key: string, defaultValue: T) {
		const res = this.values[key]
		return res === undefined ? defaultValue : (res as T)
	}

	/**
	 * Saves a value to the persistent storage.
	 */
	set(key: string, value: unknown) {
		this.values[key] = value
		window.localStorage[SAVED_STATE_KEY] = JSON.stringify(this.values)
	}
}

/**
 * State persistence for the application. This is a simple key/value store
 * backed by localStorage.
 */
const state = new State()

export default state
