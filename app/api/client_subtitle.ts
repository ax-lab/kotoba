import * as common from './common'

export async function load({ filename = '' } = {}) {
	return common.post<{ ok: boolean }>(common.URL_SUBTITLE_LOAD, { filename })
}
