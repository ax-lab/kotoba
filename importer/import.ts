import fs from 'fs'
import path from 'path'

import * as jmdict from './jmdict'

const DICT_FILE = 'jmdict_english.zip'

const DATA_DIR = path.join(__dirname, '..', 'data')

const check_data = () => {
	const stat = fs.statSync(DATA_DIR)
	if (!stat || !stat.isDirectory()) {
		console.error('Fatal error: data directory not found')
		return false
	}
	return true
}

async function main() {
	if (!check_data()) {
		return
	}
	console.log(`Data directory is ${DATA_DIR}`)

	await jmdict.import_entries(path.join(DATA_DIR, DICT_FILE))
}

main().catch((err) => {
	console.error(err)
})
