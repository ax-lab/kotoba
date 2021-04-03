import { Dir } from '../../lib'

import * as common from './common'

export async function fetch_files() {
	return common.get<Dir>(common.URL_VIDEO_FILES)
}

export async function open({ filename = '', paused = true } = {}) {
	return common.post<{ ok: boolean }>(common.URL_VIDEO_OPEN, { filename, paused })
}
