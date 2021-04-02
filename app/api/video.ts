import { Dir } from '../../lib/video_types'

import { API_BASE } from './api_common'

export async function fetch_files() {
	return fetch(`${API_BASE}/video/files`).then((x) => x.json() as Promise<Dir>)
}
