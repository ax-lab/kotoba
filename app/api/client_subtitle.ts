import { SubtitleLoadParams } from '../../lib'

import * as common from './common'

export async function load(args: SubtitleLoadParams = {}) {
	return common.post<{ ok: boolean }>(common.URL_SUBTITLE_LOAD, args)
}
