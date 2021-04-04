import fs from 'fs'
import path from 'path'

import { Express } from 'express'

import { Dir, EventVideoPlayback, PlaybackInfo } from '../lib'

import config from './config'
import { events } from './event_dispatcher'
import { MPV } from './mpv'

const RE_VIDEO_EXTENSION = /\.(mp4|avi|mkv|webm|wmv)$/i
const RE_SUB_EXTENSION = /\.(ass|srt)$/i

let last_playback: PlaybackInfo | undefined
let play_timestamp = new Date()

MPV.get().on('playback', (info) => {
	last_playback = info
	play_timestamp = new Date()
	send_playback_info(info)
})

// Make sure to send playback events even when paused in case a client reloads
// or connects mid-stream.
setInterval(() => {
	if (last_playback) {
		const dt = new Date().getTime() - play_timestamp.getTime()
		if (dt > 200) {
			play_timestamp = new Date()
			send_playback_info(last_playback)
		}
	}
}, 100)

function send_playback_info(info?: PlaybackInfo) {
	events.post<EventVideoPlayback>({
		type: 'video-playback',
		play: info,
	})
}

function open_video(filename: string, paused = false) {
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
		if (RE_VIDEO_EXTENSION.test(fullpath)) {
			MPV.get().open_file(fullpath, { paused })
			return
		}
	}

	MPV.get().open()
}

async function list_files(): Promise<Dir> {
	return new Promise((resolve) => {
		const root: Dir = { type: 'dir', name: '', path: '', list: [] }

		let wait = 0

		for (const it of config().media) {
			const media: Dir = { type: 'dir', name: it.name, path: '', list: [] }
			read_dir(it.path, media)
			root.list.push(media)
		}

		function read_dir(base: string, parent: Dir) {
			wait++
			fs.readdir(base, { withFileTypes: true }, (err, files) => {
				for (const it of files || []) {
					const fullpath = parent.path ? `${parent.path}/${parent.name}` : parent.name
					if (it.isFile()) {
						if (RE_VIDEO_EXTENSION.test(it.name)) {
							parent.list.push({
								type: 'video',
								name: it.name,
								path: fullpath,
							})
						} else if (RE_SUB_EXTENSION.test(it.name)) {
							parent.list.push({
								type: 'subtitle',
								name: it.name,
								path: fullpath,
							})
						}
					} else {
						const dir: Dir = {
							type: 'dir',
							name: it.name,
							path: fullpath,
							list: [],
						}
						parent.list.push(dir)
						read_dir(path.join(base, dir.name), dir)
					}
				}
				wait--
				if (wait == 0) {
					root.list.forEach((x) => sort_dir(x as Dir))
					resolve(root)
				}
			})
		}

		function sort_dir(root: Dir): boolean {
			root.list = root.list.filter((it) => {
				if (it.type == 'dir') {
					return sort_dir(it)
				}
				return true
			})
			root.list.sort((a, b) => {
				if (a.type != b.type) {
					if (a.type == 'dir' || b.type == 'dir') {
						return a.type == 'dir' ? +1 : -1
					}
				}
				return a.name.localeCompare(b.name)
			})
			return root.list.length > 0
		}
	})
}

export default function serve_video(app: Express, base: string) {
	app.post(`${base}/video/open`, (req, res) => {
		const params = req.body as Record<string, unknown>
		const filename = ((params && params.filename) as string) || ''
		const paused = !!(params && params.paused)
		open_video(filename, paused)
		res.json({ ok: true })
	})

	app.post(`${base}/video/close`, (req, res) => {
		MPV.get().close()
		res.json({ ok: true })
	})

	app.get(`${base}/video/files`, (req, res) => {
		list_files().then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})
}
