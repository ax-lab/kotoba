import fs from 'fs'
import path from 'path'

import * as lib from '../lib'

import { open_zip } from './util'

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

	const start = lib.now()

	const zip = await open_zip(path.join(DATA_DIR, DICT_FILE))
	const data = await zip.files['data.xml'].async('string')
	console.log(`Loaded data.xml with ${lib.bytes(data.length)} in ${lib.elapsed(start)}`)
}

main().catch((err) => {
	console.error(err)
})
