const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

export function bytes(value: number) {
	if (value >= GB) {
		return `${(value / GB).toFixed(2)}GB`
	}
	if (value >= MB) {
		return `${(value / MB).toFixed(2)}MB`
	}
	if (value >= KB) {
		return `${(value / KB).toFixed(1)}KB`
	}
	if (value == 1) {
		return '1 byte'
	}
	return `${value} bytes`
}

/**
 * Returns a high resolution relative timestamp in milliseconds.
 */
export const now =
	typeof process == 'object' && typeof process.hrtime == 'function'
		? () => {
				const [s, ns] = process.hrtime()
				return s * 1000 + ns / 1000000
		  }
		: () => performance.now()

/**
 * Async sleep function with support for cancellation.
 */
export async function sleep(delay_ms: number, cancel?: { cancelled: boolean }) {
	// Maximum incremental step for checking cancellation
	const STEP_MS = 5

	// Asynchronously sleeps for the target number of milliseconds.
	const do_sleep = async (ms: number) => {
		await new Promise<void>((resolve) => {
			setTimeout(() => resolve(), ms)
		})
	}

	if (!cancel) {
		// if no cancelation is given, just do a raw sleep for the target time
		await do_sleep(delay_ms)
	} else {
		// if a cancelation is given, we limit the sleep in steps of STEP_MS
		// and check the cancelation flag
		const start = now()
		let is_first = true
		while (true) {
			// check cancellation
			if (cancel.cancelled) {
				return
			}

			// check how much time is left is the sleep
			const delta = now() - start
			const delay = Math.max(0, delay_ms - delta)

			// for the first time, we sleep even if the delay is zero to be
			// compatible with a setTimeout
			if (delay > 0 || is_first) {
				is_first = false
				await do_sleep(Math.min(STEP_MS, delay))
			} else {
				return
			}
		}
	}
}

/**
 * Returns a human-readable elapsed duration string from a base time returned
 * by `now`.
 */
export function elapsed(start: number) {
	return duration(now() - start)
}

export function duration(delta_ms: number) {
	// Nanosecond range
	const ns = Math.round(delta_ms * 1e6)
	if (ns < 1000) {
		return ns == 0 ? '0s' : `${ns}ns`
	}

	// Microsecond range
	const us = delta_ms * 1000
	if (Math.round(us) < 1000) {
		return us < 10 ? `${us.toFixed(1)}us` : `${Math.round(us)}us`
	}

	// Millisecond range
	if (Math.round(delta_ms) < 1000) {
		if (delta_ms < 10) {
			return `${delta_ms.toFixed(3)}ms`
		}
		if (delta_ms < 100) {
			return `${delta_ms.toFixed(1)}ms`
		}
		return `${Math.round(delta_ms)}ms`
	}

	// Second range
	if (delta_ms < 60000) {
		const sec = delta_ms / 1000
		return sec < 10 ? `${sec.toFixed(3)}s` : `${sec.toFixed(1)}s`
	}

	const min = Math.floor(delta_ms / 60000)
	const sec = Math.round((delta_ms % 60000) / 1000)
	return `${min}m${sec.toString().padStart(2, '0')}s`
}

export function escape_regex(text: string) {
	return text.trim().replace(/[.(){|}+?*^$[\]\\]/g, '\\$&')
}

export function compile_glob(text: string) {
	const src = [...text]
		.map((chr) => {
			if (chr == '*') {
				return '.*'
			} else if (chr == '?') {
				return '.'
			} else {
				return escape_regex(chr)
			}
		})
		.join('')
	return new RegExp(`^${src}$`, 'iu')
}
