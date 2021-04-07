import { Express } from 'express'

import { VideoLoopParams } from '../lib'

import App from './app'
import { list_files } from './media'
import { MPV } from './mpv'

export default function serve_video(app: Express, base: string) {
	app.post(`${base}/video/open`, (req, res) => {
		const params = req.body as Record<string, unknown>
		const filename = ((params && params.filename) as string) || ''
		const paused = !!(params && params.paused)
		App.get().open_video(filename, paused)
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
		App.get().loop_video(params)
		res.json({ ok: true })
	})

	app.get(`${base}/video/files`, (req, res) => {
		list_files('video').then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})
}
