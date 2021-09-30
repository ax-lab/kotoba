import fs from 'fs'
import path from 'path'
import util from 'util'

import { v4 as uuid } from 'uuid'

import {
	EventSubtitleChange,
	EventVideoPlayback,
	MediaHistoryEntry,
	MediaSavedState,
	SavedSubtitleMedia,
	SubtitleEdit,
	SubtitleEditor,
	SubtitleEditParams,
	SubtitleFile,
	VideoLoopParams,
} from '../lib'

import { server_events } from './event_dispatcher'
import { get_media_path, RE_SUB_EXTENSION, RE_VIDEO_EXTENSION } from './media'
import { Player } from './player'
import Store from './store'

const MAX_MEDIA_HISTORY = 100

export default class App {
	static _instance = new App()

	static get() {
		return this._instance
	}

	static get current_playback(): EventVideoPlayback {
		const player = Player.current
		if (!player) {
			return { type: 'video-playback' }
		}
		const media_path = player.media_path
		return {
			type: 'video-playback',
			play: player.playback_info,
			data: media_path ? this.query_media_state(media_path) : undefined,
		}
	}

	private constructor() {
		server_events.add_initializer(() => this._subtitle)
		server_events.add_initializer(() => App.current_playback)
		server_events.add_initializer(() => {
			const ls = App.query_media_history()
			if (ls.length) {
				return { type: 'media-history', mode: 'add', data: ls }
			}
			return
		})

		Player.events.on('exit', () => {
			void this.load_subtitle('')
			server_events.post(App.current_playback)
		})

		Player.events.on('playback', () => {
			server_events.post(App.current_playback)
		})
	}

	private _subtitle?: EventSubtitleChange
	private _subtitle_file?: SubtitleFile

	get subtitle() {
		return this._subtitle
	}

	async open_video(filename: string, paused = false) {
		const fullpath = get_media_path(filename)

		// Check if path is valid and is a video file
		if (!fullpath || !RE_VIDEO_EXTENSION.test(fullpath)) {
			return false
		}

		// Check if the video is not already open
		if (Player.current?.file_path.value == fullpath) {
			return true
		}

		// Check if the file exists
		const fp = await stat(fullpath)
		if (!fp || !fp.isFile()) {
			return false
		}

		// Update history
		//----------------------------------------------------------------//

		const history_removed: MediaHistoryEntry[] = []
		const history_new: MediaHistoryEntry = {
			id: uuid(),
			type: 'video',
			date: new Date().toJSON(),
			file: filename,
		}

		App.query_media_history((ls) => {
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

		const player = await Player.open()
		const ok = await player.open_file(fullpath, { media_path: filename, paused })
		if (ok) {
			try {
				// Load the default subtitle for the video
				const state = App.query_media_state(filename)
				await this.load_subtitle(state?.subtitle, { no_video: true })
			} catch (err) {
				console.error('ERR: failed to autoload subtitles for video: ', err)
			}
		}

		return ok
	}

	async close_video() {
		const player = Player.current
		return player ? await player.close() : true
	}

	async load_subtitle(filename?: string, { no_video = false } = {}) {
		if (!filename) {
			this.update_subtitle_file(undefined)
			return true
		}

		let fullpath = get_media_path(filename)
		if (!fullpath || !RE_SUB_EXTENSION.test(fullpath)) {
			return false
		}

		const media_path = Player.current?.media_path
		if (media_path) {
			const edits = App.query_subtitle_edits(media_path, filename)
			if (edits?.cached_file) {
				fullpath = edits.cached_file
			}
		}

		const text = await read_file(fullpath, 'utf-8')
		if (!text) {
			return false
		}

		const sub = new SubtitleFile(filename, text)
		this.update_subtitle_file(sub)

		if (media_path) {
			// If there is a media open, associate it with this subtitle.
			App.query_media_state(media_path, (media) => {
				return { ...media, subtitle: filename }
			})
			App.query_subtitle_media(filename, (media) => {
				return { ...media, media_path: media_path }
			})

			// Load the subtitle in the video
			const ok = await Player.current?.load_subtitle(fullpath, {
				name: media_path,
				label: 'Kotoba',
			})
			return ok != null ? ok : false
		} else if (!no_video && !Player.current?.has_file) {
			// If we are not playing anything, load the associated
			// media file, if any.
			const media = App.query_subtitle_media(filename)
			if (media?.media_path) {
				try {
					await this.open_video(media.media_path, true)
				} catch (err) {
					console.error('ERR: failed to auto-open media file:', err)
				}
			}
		}
		return true
	}

	async loop_video(params: VideoLoopParams) {
		const player = Player.current
		if (!player || !player.has_file) {
			return false
		}

		const media_path = player.media_path
		if (!media_path) {
			return false
		}

		// Check new loop parameters if any
		let new_a = params.a
		let new_b = params.b
		if (new_a! > new_b!) {
			const c = new_a
			new_a = new_b
			new_b = c
		}

		if (params.save) {
			// Save will only save the current parameters, without applying
			// them to the player (unless we are already looping).
			const playback = App.current_playback.play
			let is_looping = false
			let loop_a: number | undefined
			let loop_b: number | undefined
			App.query_media_state(media_path, (state) => {
				loop_a = state?.loop_a
				loop_b = state?.loop_b

				// Check if the video is looping, and the parameters are equal
				// to the current ones.
				is_looping = !!(player.is_looping && playback?.loop_a == loop_a && playback?.loop_b == loop_b)

				// apply new values if any
				new_a != null && (loop_a = new_a)
				new_b != null && (loop_b = new_b)

				// save the new loop state
				return { ...state, loop_a, loop_b }
			})

			if (is_looping) {
				return await player.loop(loop_a, loop_b, { seek: false })
			}
			return true
		} else {
			return await player.loop(new_a, new_b, { seek: true })
		}
	}

	/*=========================================================================*
	 * Subtitle editing
	 *=========================================================================*/

	undo_subtitle() {
		return this.do_edit_subtitle('undo')
	}

	edit_subtitle(params: SubtitleEditParams) {
		return this.do_edit_subtitle(params)
	}

	private async do_edit_subtitle(params: SubtitleEditParams | 'undo') {
		const subtitle_path = this._subtitle_file?.name
		const media_path = App.current_playback.play?.media_path
		if (!(subtitle_path && media_path)) {
			return false
		}

		const fullpath = get_media_path(subtitle_path)
		if (!fullpath || !RE_SUB_EXTENSION.test(fullpath)) {
			return false
		}

		const text = await read_file(fullpath, 'utf-8')
		if (!text) {
			return false
		}

		const sub = new SubtitleFile(subtitle_path, text)

		const saved = App.query_subtitle_edits(media_path, sub.name)
		const editor = new SubtitleEditor(sub)

		const saved_edits = saved?.edits || []
		if (params == 'undo') {
			if (!saved_edits.length) {
				return true
			}
			saved_edits.length--
		}
		for (const it of saved_edits) {
			editor.apply(it)
		}

		if (params != 'undo') {
			for (const it of params.list) {
				editor.apply(it)
			}
		}

		const name = path.basename(sub.name)

		const cache_dir = `${Store.storage_dir}/subtitles`
		if (!(await mkdir(cache_dir))) {
			return false
		}

		const save_path = saved?.cached_file || `${cache_dir}/${uuid()}-${name}`
		if (!(await write_file(save_path, sub.text))) {
			return false
		}

		App.query_subtitle_edits(media_path, sub.name, (saved) => {
			return { ...saved, cached_file: save_path, edits: [...editor.edits] }
		})

		this.update_subtitle_file(sub)

		const player = Player.current
		if (player && player.media_path) {
			await player.load_subtitle(save_path, { name: sub.name, label: 'Kotoba' })
		}

		return true
	}

	update_subtitle_file(sub: SubtitleFile | undefined) {
		this._subtitle_file = sub
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
	}

	/*=========================================================================*
	 * Persistent state
	 *=========================================================================*/

	private static store_subtitle_edit() {
		return Store.named('subtitle-edit')
	}

	private static store_media_state() {
		return Store.named('media-state')
	}

	private static store_media_history() {
		return Store.named('media-history')
	}

	private static store_subtitle_media() {
		return Store.named('subtitle-media')
	}

	static query_subtitle_edits(
		video_file: string,
		subtitle_file: string,
		updater?: (state?: SavedSubtitleEdits) => SavedSubtitleEdits | undefined,
	) {
		const store = this.store_subtitle_edit()
		const key = video_file + '\n' + subtitle_file
		const prev = store.get<SavedSubtitleEdits>(key)
		if (updater) {
			const next = updater(prev)
			store.set(key, next)
			return next
		}
		return prev
	}

	static query_media_state(media_file: string, updater?: (state?: MediaSavedState) => MediaSavedState | undefined) {
		const store = this.store_media_state()
		const prev = store.get<MediaSavedState>(media_file)
		if (updater) {
			const next = updater(prev)
			store.set(media_file, next)
			return next
		}
		return prev
	}

	static query_subtitle_media(
		subtitle: string,
		updater?: (state?: SavedSubtitleMedia) => SavedSubtitleMedia | undefined,
	) {
		const store = this.store_subtitle_media()
		const prev = store.get<SavedSubtitleMedia>(subtitle)
		if (updater) {
			const next = updater(prev)
			store.set(subtitle, next)
			return next
		}
		return prev
	}

	static query_media_history(updater?: (history: MediaHistoryEntry[]) => MediaHistoryEntry[]) {
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

type SavedSubtitleEdits = {
	cached_file: string
	edits: SubtitleEdit[]
}

const fs_stat = util.promisify(fs.stat)
const fs_read_file = util.promisify(fs.readFile)
const fs_write_file = util.promisify(fs.writeFile)
const fs_mkdir = util.promisify(fs.mkdir)

/**
 * Same as `fs.stat` but async and returns undefined instead of throwing an
 * error.
 */
async function stat(...args: Parameters<typeof fs_stat>) {
	try {
		return await fs_stat(...args)
	} catch (err) {
		return
	}
}

/**
 * Same as `fs.readFile` but async and does not throw exceptions.
 */
async function read_file(...args: Parameters<typeof fs_read_file>) {
	try {
		const res = await fs_read_file(...args)
		if (res instanceof Buffer) {
			return res.toString('utf-8')
		}
		return res
	} catch (err) {
		console.error('ERR: failed to open file:', err)
		return
	}
}

/**
 * Same as `fs.writeFile` but async and does not throw exceptions.
 */
async function write_file(...args: Parameters<typeof fs_write_file>) {
	try {
		await fs_write_file(...args)
		return true
	} catch (err) {
		console.error('ERR: failed to write file:', err)
		return false
	}
}

/**
 * Recursively create the given directory if it does not exist.
 */
async function mkdir(dir: string) {
	try {
		await fs_mkdir(dir, { recursive: true })
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code != 'EEXIST') {
			console.error('ERR: failed to create directory:', err)
			return false
		}
	}
	return true
}
