import path from 'path'

import config from './config'

export function get_media_path(filename: string) {
	const parts = filename.replace(/^\\/g, '/').replace(/^\//, '').split('/')
	if (parts.indexOf('..') >= 0) {
		parts.length = 0
	}

	const root = parts.shift()
	const media =
		root &&
		config()
			.media.filter((x) => x.name == root)
			.shift()
	if (media) {
		const fullpath = path.join(media.path, ...parts)
		return fullpath
	}
	return
}
