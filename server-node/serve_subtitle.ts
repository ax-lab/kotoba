import * as path from 'path'

import AdmZip from 'adm-zip'
import { Express } from 'express'

import { SubtitleEditParams, SubtitleLoadParams } from '../lib-ts'

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

	app.get(`${base}/subtitle/dump`, (req, res) => {
		const errors: Record<string, string> = {}
		const subs = App.all_subtitles().map(([sub_path, info]) => {
			return App.get_edited_subtitle(sub_path, info.media_path)
				.then((data) => {
					if (!data) {
						errors[sub_path] = 'failed to load'
					} else if (!info.media_path) {
						errors[sub_path] = 'warning: no media information'
					}
					return data ? { subtitle: sub_path, media: info.media_path, data } : null
				})
				.catch((err) => {
					errors[sub_path] = String(err)
				})
		})

		const all = Promise.all(subs).then((list) => {
			const zip = new AdmZip()
			if (Object.keys(errors).length > 0) {
				zip.addFile('00-errors.json', Buffer.from(JSON.stringify(errors, null, '\t'), 'utf8'))
			}

			for (const it of list) {
				if (!it) {
					continue
				}

				const comment = `${it.subtitle} for ${it.media || 'no media'}`
				let zip_path: string
				if (it.media) {
					const ext = path.extname(it.subtitle)
					const name = it.media.substring(0, it.media.length - path.extname(it.media).length)
					zip_path = name + ext
				} else {
					zip_path = `no-media/${it.subtitle}`
				}
				zip.addFile(zip_path, Buffer.from(it.data, 'utf8'), comment)
			}

			return zip.toBuffer()
		})
		all.then(
			(result) => {
				res.writeHead(200, {
					'Content-Disposition': 'attachment; filename="kotoba-subtitles.zip"',
					'Content-Type': 'application/zip',
				})
				return res.end(result)
			},
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})

	app.get(`${base}/subtitle/files`, (req, res) => {
		list_files('subtitle').then(
			(result) => res.json(result),
			(error) => res.status(500).json({ error: `${error as string}` }),
		)
	})

	app.post(`${base}/subtitle/edit`, (req, res) => {
		const params = (req.body || {}) as SubtitleEditParams
		App.get()
			.edit_subtitle(params)
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).write({ error: String(err) })
			})
	})

	app.post(`${base}/subtitle/undo`, (req, res) => {
		App.get()
			.undo_subtitle()
			.then((ok) => {
				res.json({ ok })
			})
			.catch((err) => {
				res.status(500).write({ error: String(err) })
			})
	})
}
