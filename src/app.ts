import fs from 'fs'

import { v4 as uuid } from 'uuid'

import {
	EventSubtitleChange,
	EventVideoPlayback,
	MediaHistoryEntry,
	MediaSavedState,
	SubtitleFile,
	VideoLoopParams,
} from '../lib'

import { server_events } from './event_dispatcher'
import { get_media_path, RE_VIDEO_EXTENSION } from './media'
import { MPV } from './mpv'
import Store from './store'

const MAX_MEDIA_HISTORY = 100

export default class App {
	static _instance = new App()

	static get() {
		return this._instance
	}

	private constructor() {
		server_events.add_initializer(() => this._subtitle)
		server_events.add_initializer(() => this._playback || { type: 'video-playback' })
		server_events.add_initializer(() => {
			const ls = this.query_media_history()
			if (ls.length) {
				return { type: 'media-history', mode: 'add', data: ls }
			}
			return
		})

		MPV.get().on('playback', (info) => {
			this._playback = {
				type: 'video-playback',
				play: info,
				data: info?.file_name ? this.query_media_state(info.file_name) : undefined,
			}
			server_events.post(this._playback)
		})
	}

	private _subtitle?: EventSubtitleChange
	private _playback?: EventVideoPlayback

	get subtitle() {
		return this._subtitle
	}

	get playback() {
		return this._playback
	}

	load_subtitle(filename?: string) {
		if (!filename) {
			this._subtitle = { type: 'subtitle-change', open: false }
			server_events.post(this._subtitle)
			return
		}

		const fullpath = get_media_path(filename)
		if (fullpath) {
			fs.readFile(fullpath, 'utf-8', (err, text) => {
				if (!err) {
					const sub = new SubtitleFile(filename, text)
					this._subtitle = {
						type: 'subtitle-change',
						open: !!sub,
						...(!sub
							? {}
							: {
									data: sub.dialogues,
									text: sub.text,
									file: sub.name,
							  }),
					}
					server_events.post(this._subtitle)
				} else {
					console.error('Could not load subtitle', err)
				}
			})
		}
	}

	open_video(filename: string, paused = false) {
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

					this.query_media_history((ls) => {
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

					server_events.post({
						type: 'media-history',
						mode: 'del',
						data: history_removed,
					})
					server_events.post({
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

	loop_video(params: VideoLoopParams) {
		const file_name = this._playback?.play?.file_name
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
				App.get().query_media_state(file_name, (state) => {
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
		}
	}

	/*========================================================================*
	 * Persistent state
	 *========================================================================*/

	private store_media_state() {
		return Store.named('media-state')
	}

	private store_media_history() {
		return Store.named('media-history')
	}

	query_media_state(filename: string, updater?: (state?: MediaSavedState) => MediaSavedState | undefined) {
		const store = this.store_media_state()
		const prev = store.get<MediaSavedState>(filename)
		if (updater) {
			const next = updater(prev)
			store.set(filename, next)
			return next
		}
		return prev
	}

	query_media_history(updater?: (history: MediaHistoryEntry[]) => MediaHistoryEntry[]) {
		const store = this.store_media_history()
		const prop = 'list'
		const prev = store.get<MediaHistoryEntry[]>(prop, [])!
		if (updater) {
			const next = updater(prev)
			store.set(prop, next)
			return next
		}
		return prev
	}
}
