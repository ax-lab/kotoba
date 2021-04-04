import { Dir } from '../../lib'

import * as common from './common'

export async function fetch_files() {
	return common.get<Dir>(common.URL_VIDEO_FILES)
}

export async function open({ filename = '', paused = true } = {}) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_OPEN, { filename, paused })
}

export async function close() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_CLOSE)
}

export async function play() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PLAY)
}

export async function pause() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PAUSE)
}

export async function loop(args: { a: number; b: number }) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, args)
}

export async function stop_loop() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, { a: -1, b: -1 })
}
