const SAVED_STATE_KEY = 'saved-state'

type StateMap = { [key: string]: unknown }

const state: StateMap = (() => {
	try {
		return JSON.parse(window.localStorage[SAVED_STATE_KEY]) as StateMap
	} catch (e) {
		// ignore any errors
	}
	return {}
})()

export function getValue<T>(key: string, defaultValue: T) {
	const res = state[key]
	return res === undefined ? defaultValue : (res as T)
}

export function setValue(key: string, value: unknown) {
	state[key] = value
	window.localStorage[SAVED_STATE_KEY] = JSON.stringify(state)
}
