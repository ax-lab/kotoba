import fs from 'fs'

const STORE_DEFAULT_DIR = './.store'

type MediaRoot = {
	name: string
	path: string
}

export type Config = {
	media: MediaRoot[]
	store: string
}

let current: Config

export default function config() {
	if (!current) {
		current = load_config()
	}
	return current
}

export function get_store_dir() {
	return config().store || STORE_DEFAULT_DIR
}

function load_config() {
	const config: Config = { media: [], store: '' }
	;['./config/app.json', './config/app.local.json'].forEach((name) => {
		try {
			Object.assign(config, JSON.parse(fs.readFileSync(name, 'utf-8')))
		} catch (e) {
			// ignore error
		}
	})

	return config
}
