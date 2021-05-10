import { Dir, VideoLoopParams, VideoSeekParams } from '../../lib'

import * as common from './common'
import { events } from './events'

export async function fetch_files() {
	return common.get<Dir>(common.URL_VIDEO_FILES)
}

export async function open({ filename = '', paused = true } = {}) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_OPEN, { filename, paused })
}

export async function close() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_CLOSE)
}

export async function toggle_play() {
	if (!events.current_playback?.play) {
		return
	}

	if (events.current_playback?.play?.paused) {
		await play()
	} else {
		await pause()
	}
}

export async function play() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PLAY)
}

export async function pause() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PAUSE)
}

export async function loop(args: VideoLoopParams) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, args)
}

export async function seek(args: VideoSeekParams) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_SEEK, args)
}

export async function stop_loop() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, { a: -1, b: -1 })
}
