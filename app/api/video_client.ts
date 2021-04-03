import { Dir } from '../../lib'

import * as common from './common'

export async function fetch_files() {
	return fetch(common.URL_VIDEO_FILES).then((x) => x.json() as Promise<Dir>)
}
