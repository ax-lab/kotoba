import { Express } from 'express'
import { v4 as uuid } from 'uuid'

import { ServerEvent } from '../lib'

import { server_events } from './event_dispatcher'

const clients = new Map<string, (data: string) => void>()

server_events.handle((event: ServerEvent) => {
	const data = JSON.stringify(event)
	for (const post of clients.values()) {
		post(data)
	}
})

export default function serve_events(app: Express, base: string) {
	app.get(`${base}/events`, (req, res) => {
		const id = uuid()
		const headers = {
			'Content-Type': 'text/event-stream',
			Connection: 'keep-alive',
			'Cache-control': 'no-cache',
		}

		res.writeHead(200, headers)

		const post = (data: string) => {
			res.write(`data: ${data}\n\n`)
		}

		clients.set(id, post)

		req.on('close', () => {
			clients.delete(id)
		})

		post(JSON.stringify({ id, type: 'connected' }))

		// force a playback event to initialize the client state
		for (const ev of server_events.get_snapshot()) {
			post(JSON.stringify(ev))
		}
	})
}
