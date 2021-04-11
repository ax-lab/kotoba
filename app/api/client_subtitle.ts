import { Dir, SubtitleEditParams, SubtitleLoadParams } from '../../lib'

import * as common from './common'

export async function load(args: SubtitleLoadParams = {}) {
	return common.post<{ ok: boolean }>(common.URL_SUBTITLE_LOAD, args)
}

export async function edit(args: SubtitleEditParams) {
	return common.post<Dir>(common.URL_SUBTITLE_EDIT, args)
}

export async function undo() {
	return common.post<Dir>(common.URL_SUBTITLE_UNDO)
}

export async function fetch_files() {
	return common.get<Dir>(common.URL_SUBTITLE_FILES)
}
