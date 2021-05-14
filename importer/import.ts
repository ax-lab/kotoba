import fs from 'fs'
import path from 'path'

import sax from 'sax'

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

	const strict = true
	const parser = sax.parser(strict)

	// Process the first part of the file for entities. Entities have the
	// format `<!ENTITY hob "Hokkaido-ben">`
	const matches = data.slice(0, 256 * 1024).matchAll(/<!ENTITY\s+([-\w]+)\s+"([^"]+)"\s*>/g)
	const tags: Record<string, string> = {}
	for (const it of matches) {
		const [, entity, label] = it
		tags[entity] = label
		parser.ENTITIES[entity] = `{{${entity}}}`
	}

	// This is present on the last entry, but undeclared.
	parser.ENTITIES['unc'] = '{{unc}}'

	const max_events = 100
	let count = 0

	parser.onopentag = (node) => {
		if (count > max_events) return
		console.log(node)
		count++
	}

	parser.onclosetag = (node) => {
		if (count > max_events) return
		console.log('CLOSE', node)
	}

	parser.ontext = (text) => {
		if (count > max_events) return
		console.log('TEXT', text)
	}

	const start_xml = lib.now()
	parser.write(data)
	parser.close()
	console.log(`Processed XML in ${lib.elapsed(start_xml)}`)
}

main().catch((err) => {
	console.error(err)
})
