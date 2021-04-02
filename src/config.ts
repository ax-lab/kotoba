import fs from 'fs'

type MediaRoot = {
	name: string
	path: string
}

export type Config = {
	media: MediaRoot[]
}

let current: Config

export default function config() {
	if (!current) {
		current = load_config()
	}
	return current
}

function load_config() {
	const config: Config = { media: [] }
	;['./config/app.json', './config/app.local.json'].forEach((name) => {
		try {
			Object.assign(config, JSON.parse(fs.readFileSync(name, 'utf-8')))
		} catch (e) {
			// ignore error
		}
	})

	return config
}
