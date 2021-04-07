import { Dir, EventSubtitleChange, SubtitleLoadParams } from '../../lib'

import * as common from './common'
import { events } from './events'

export async function load(args: SubtitleLoadParams = {}) {
	return common.post<{ ok: boolean }>(common.URL_SUBTITLE_LOAD, args)
}

export async function fetch_files() {
	return common.get<Dir>(common.URL_SUBTITLE_FILES)
}

let current_subtitle: EventSubtitleChange | undefined

export function get_current_subtitle() {
	return current_subtitle
}

export function on_change(callback: (ev: EventSubtitleChange) => void) {
	return events.register((ev) => {
		if (ev.type == 'subtitle-change') {
			callback(ev)
		}
	})
}

on_change((ev) => {
	current_subtitle = ev
})
