import { Express } from 'express'

import { VideoLoopParams } from '../lib'

import App from './app'
import { list_files } from './media'
import { Player } from './player'

export default function serve_video(app: Express, base: string) {
	app.post(`${base}/video/open`, (req, res) => {
		const params = req.body as Record<string, unknown>
		const filename = ((params && params.filename) as string) || ''
		const paused = !!(params && params.paused)
		App.get()
			.open_video(filename, paused)
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).json({ error: String(err) })
			})
	})

	app.post(`${base}/video/close`, (_req, res) => {
		App.get()
			.close_video()
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).json({ error: String(err) })
			})
	})

	app.post(`${base}/video/play`, (_req, res) => {
		const player = Player.current
		if (!player) {
			res.json({ ok: false })
		} else {
			player
				.play()
				.then((ok) => {
					res.json({ ok })
				})
				.catch((err) => {
					res.status(500).json({ error: String(err) })
				})
		}
	})

	app.post(`${base}/video/pause`, (req, res) => {
		const player = Player.current
		if (!player) {
			res.json({ ok: false })
		} else {
			player
				.pause()
				.then((ok) => {
					res.json({ ok })
				})
				.catch((err) => {
					res.status(500).json({ error: String(err) })
				})
		}
	})

	app.post(`${base}/video/loop`, (req, res) => {
		const params = (req.body as VideoLoopParams) || {}
		App.get()
			.loop_video(params)
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).json({ error: String(err) })
			})
	})

	app.get(`${base}/video/files`, (req, res) => {
		list_files('video').then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})
}
