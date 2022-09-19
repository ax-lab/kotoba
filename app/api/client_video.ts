import { Dir, VideoLoopParams, VideoSeekParams } from '../../lib-ts'

import * as common from './common'
import { events } from './events'

export async function fetch_files() {
	return common.get<Dir>(common.URL_VIDEO_FILES)
}

export async function open({ filename = '', paused = true } = {}) {
	events.target_playback_position = null
	return common.post<{ ok: boolean }>(common.URL_VIDEO_OPEN, { filename, paused })
}

export async function close() {
	events.target_playback_position = null
	return common.post<{ ok: boolean }>(common.URL_VIDEO_CLOSE)
}

export async function toggle_play() {
	events.target_playback_position = null
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
	events.target_playback_position = null
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PLAY)
}

export async function pause() {
	events.target_playback_position = null
	return common.post<{ ok: boolean }>(common.URL_VIDEO_PAUSE)
}

export async function loop(args: VideoLoopParams) {
	events.target_playback_position = null
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, args)
}

export async function seek(args: VideoSeekParams) {
	// update locally so seeks in quick succession work as expected
	const cur = events.current_playback?.play
	if (cur && cur.position != null) {
		const curpos = events.target_playback_position || cur.position
		const target = args.relative ? curpos + args.position : args.position
		events.target_playback_position = target
		events.target_playback_original = cur.position // keep it relative to the real position
	}
	return common.post<{ ok: boolean }>(common.URL_VIDEO_SEEK, args)
}

export async function stop_loop() {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_LOOP, { a: -1, b: -1 })
}
