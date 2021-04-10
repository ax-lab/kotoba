import { Dir, SubtitleLoadParams } from '../../lib'

import * as common from './common'

export async function load(args: SubtitleLoadParams = {}) {
	return common.post<{ ok: boolean }>(common.URL_SUBTITLE_LOAD, args)
}

export async function fetch_files() {
	return common.get<Dir>(common.URL_SUBTITLE_FILES)
}
