/** Root path for the API */
export const API_BASE = '/api'

export const URL_VIDEO_FILES = `${API_BASE}/video/files`
export const URL_VIDEO_OPEN = `${API_BASE}/video/open`
export const URL_VIDEO_CLOSE = `${API_BASE}/video/close`
export const URL_VIDEO_PLAY = `${API_BASE}/video/play`
export const URL_VIDEO_PAUSE = `${API_BASE}/video/pause`
export const URL_VIDEO_LOOP = `${API_BASE}/video/loop`

export const URL_SUBTITLE_LOAD = `${API_BASE}/subtitle/load`

export function get<T>(url: string) {
	return fetch(url).then((x) => x.json() as Promise<T>)
}

export function post<T>(url: string, data?: Record<string, unknown>) {
	return !data
		? fetch(url, { method: 'POST' })
		: fetch(url, {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
				},
		  }).then((x) => x.json() as Promise<T>)
}
