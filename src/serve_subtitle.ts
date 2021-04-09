import { Express } from 'express'

import { SubtitleLoadParams } from '../lib'

import App from './app'
import { list_files } from './media'

export default function serve_subtitle(app: Express, base: string) {
	app.post(`${base}/subtitle/load`, (req, res) => {
		const params = (req.body || {}) as SubtitleLoadParams
		App.get()
			.load_subtitle(params.filename)
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).write({ error: String(err) })
			})
	})

	app.get(`${base}/subtitle/files`, (req, res) => {
		list_files('subtitle').then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})
}
