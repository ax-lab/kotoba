import fs from 'fs'

import { Express } from 'express'

import { EventSubtitleChange, SubtitleFile, SubtitleLoadParams } from '../lib'

import { events } from './event_dispatcher'
import { get_media_path } from './media'

let current_subtitle: SubtitleFile | undefined

events.add_initializer(() => get_change_event())

function get_change_event(): EventSubtitleChange {
	return {
		type: 'subtitle-change',
		open: !!current_subtitle,
		...(!current_subtitle
			? {}
			: {
					data: current_subtitle.dialogues,
					text: current_subtitle.text,
					file: current_subtitle.name,
			  }),
	}
}

function load_subtitle(filename: string) {
	const fullpath = get_media_path(filename)
	if (fullpath) {
		fs.readFile(fullpath, 'utf-8', (err, text) => {
			if (!err) {
				current_subtitle = new SubtitleFile(filename, text)
				events.post(get_change_event())
			}
		})
	}
}

export default function serve_subtitle(app: Express, base: string) {
	app.post(`${base}/subtitle/load`, (req, res) => {
		const params = (req.body || {}) as SubtitleLoadParams

		const filename = params.filename || ''
		if (filename) {
			load_subtitle(filename)
		} else {
			current_subtitle = undefined
			events.post(get_change_event())
		}
		res.json({ ok: true })
	})
}
