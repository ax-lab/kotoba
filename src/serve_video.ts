import fs from 'fs'
import path from 'path'

import { Express } from 'express'
import { v4 as uuid } from 'uuid'

import { Dir, EventVideoPlayback, MediaHistoryEntry, MediaSavedState, VideoLoopParams } from '../lib'

import config from './config'
import { events } from './event_dispatcher'
import { get_media_path } from './media'
import { MPV } from './mpv'
import Store from './store'

const MAX_MEDIA_HISTORY = 100

const RE_VIDEO_EXTENSION = /\.(mp4|avi|mkv|webm|wmv)$/i
const RE_SUB_EXTENSION = /\.(ass|srt)$/i

/*============================================================================*
 * Event handling
 *============================================================================*/

// Keep the last playback event
let last_playback: EventVideoPlayback | undefined
MPV.get().on('playback', (info) => {
	last_playback = {
		type: 'video-playback',
		play: info,
		data: info?.file_name ? query_media_state(info.file_name) : undefined,
	}
	events.post(last_playback)
})

// Initialize the playback state
events.add_initializer(() => last_playback || { type: 'video-playback' })

// Send the current media history state
events.add_initializer(() => {
	const ls = query_media_history()
	if (ls.length) {
		return { type: 'media-history', mode: 'add', data: ls }
	}
	return
})

/*============================================================================*
 * Public API
 *============================================================================*/

function open_video(filename: string, paused = false) {
	const fullpath = get_media_path(filename)
	if (fullpath) {
		fs.stat(fullpath, (err, stat) => {
			if (!err && stat.isFile()) {
				const history_removed: MediaHistoryEntry[] = []
				const history_new: MediaHistoryEntry = {
					id: uuid(),
					type: 'video',
					date: new Date().toJSON(),
					file: filename,
				}

				query_media_history((ls) => {
					ls = ls.filter((x) => {
						if (x.file == history_new.file) {
							history_removed.push(x)
							return false
						}
						return true
					})
					ls.unshift(history_new)
					if (ls.length > MAX_MEDIA_HISTORY) {
						ls.length = MAX_MEDIA_HISTORY
					}
					return ls
				})

				events.post({
					type: 'media-history',
					mode: 'del',
					data: history_removed,
				})
				events.post({
					type: 'media-history',
					mode: 'add',
					data: [history_new],
				})
			}
		})

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

	app.post(`${base}/video/play`, (req, res) => {
		MPV.get().play()
		res.json({ ok: true })
	})

	app.post(`${base}/video/pause`, (req, res) => {
		MPV.get().pause()
		res.json({ ok: true })
	})

	app.post(`${base}/video/loop`, (req, res) => {
		const params = (req.body as VideoLoopParams) || {}
		const file_name = last_playback?.play?.file_name
		if (file_name) {
			let new_a = params.a
			let new_b = params.b
			if (new_a! > new_b!) {
				const c = new_a
				new_a = new_b
				new_b = c
			}

			const mpv = MPV.get()
			if (params.save) {
				query_media_state(file_name, (state) => {
					let a = state?.loop_a
					let b = state?.loop_b

					const playback = mpv.playback
					const is_looping = mpv.is_looping && playback?.loop_a == a && playback?.loop_b == b
					new_a != null && (a = new_a)
					new_b != null && (b = new_b)
					if (is_looping) {
						mpv.loop(a, b, false)
					}

					return { ...state, loop_a: a, loop_b: b }
				})
			} else {
				mpv.loop(new_a, new_b, true)
			}
			res.json({ ok: true })
		} else {
			res.json({ ok: false, error: 'no file is currently being played' })
		}
	})

	app.get(`${base}/video/files`, (req, res) => {
		list_files().then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})
}

/*============================================================================*
 * Persistent state management
 *============================================================================*/

function store_media_state() {
	return Store.named('media-state')
}

function query_media_state(filename: string, updater?: (state?: MediaSavedState) => MediaSavedState | undefined) {
	const store = store_media_state()
	const prev = store.get<MediaSavedState>(filename)
	if (updater) {
		const next = updater(prev)
		store.set(filename, next)
		return next
	}
	return prev
}

function store_media_history() {
	return Store.named('media-history')
}

function query_media_history(updater?: (history: MediaHistoryEntry[]) => MediaHistoryEntry[]) {
	const store = store_media_history()
	const prop = 'list'
	const prev = store.get<MediaHistoryEntry[]>(prop, [])!
	if (updater) {
		const next = updater(prev)
		store.set(prop, next)
		return next
	}
	return prev
}
