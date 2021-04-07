import fs from 'fs'

import { v4 as uuid } from 'uuid'

import {
	EventSubtitleChange,
	EventVideoPlayback,
	MediaHistoryEntry,
	MediaSavedState,
	SavedSubtitleMedia,
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
			const media_path = this._media_file == info?.file_path ? this._media_path : undefined

			// Detect the end of playback (e.g. player quit)
			if (!info?.file_path && this._media_file == this._playback?.play?.file_path && this._subtitle?.open) {
				this.load_subtitle('')
			}

			this._playback = {
				type: 'video-playback',
				play: info && {
					...info,
					...(media_path ? { media_path } : undefined),
				},
				data: media_path ? this.query_media_state(media_path) : undefined,
			}
			server_events.post(this._playback)
		})
	}

	private _subtitle?: EventSubtitleChange
	private _playback?: EventVideoPlayback
	private _media_path?: string
	private _media_file?: string

	get subtitle() {
		return this._subtitle
	}

	get playback() {
		return this._playback
	}

	load_subtitle(filename?: string, no_video?: boolean) {
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
									path: filename,
							  }),
					}
					server_events.post(this._subtitle)

					const media_path = this._playback?.play?.media_path
					if (media_path) {
						this.query_media_state(media_path, (media) => {
							return { ...media, subtitle: filename }
						})
						this.query_subtitle_media(filename, (media) => {
							return { ...media, media_path: media_path }
						})
					} else if (!no_video && !this._playback?.play?.file_name) {
						// If we are not playing anything, load the associated
						// media file.
						const media = this.query_subtitle_media(filename)
						if (media?.media_path) {
							this.open_video(media.media_path, true)
						}
					}
				} else {
					console.error('Could not load subtitle', err)
				}
			})
		}
	}

	open_video(filename: string, paused = false) {
		const fullpath = get_media_path(filename)
		if (fullpath && RE_VIDEO_EXTENSION.test(fullpath)) {
			if (fullpath == this._playback?.play?.file_path) {
				return
			}
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

					this._media_file = fullpath
					this._media_path = filename
					MPV.get().open_file(fullpath, { paused })

					const state = this.query_media_state(filename)
					this.load_subtitle(state?.subtitle, true)
				}
			})
		}

		MPV.get().open()
	}

	close_video() {
		this.load_subtitle('')
		MPV.get().close()
	}

	loop_video(params: VideoLoopParams) {
		const media_path = this._playback?.play?.media_path
		if (media_path) {
			let new_a = params.a
			let new_b = params.b
			if (new_a! > new_b!) {
				const c = new_a
				new_a = new_b
				new_b = c
			}

			const mpv = MPV.get()
			if (params.save) {
				App.get().query_media_state(media_path, (state) => {
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

	private store_subtitle_media() {
		return Store.named('subtitle-media')
	}

	query_media_state(media_file: string, updater?: (state?: MediaSavedState) => MediaSavedState | undefined) {
		const store = this.store_media_state()
		const prev = store.get<MediaSavedState>(media_file)
		if (updater) {
			const next = updater(prev)
			store.set(media_file, next)
			return next
		}
		return prev
	}

	query_subtitle_media(subtitle: string, updater?: (state?: SavedSubtitleMedia) => SavedSubtitleMedia | undefined) {
		const store = this.store_subtitle_media()
		const prev = store.get<SavedSubtitleMedia>(subtitle)
		if (updater) {
			const next = updater(prev)
			store.set(subtitle, next)
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
