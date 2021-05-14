import fs from 'fs'
import { promisify } from 'util'

import JSZip from 'jszip'

const read_file = promisify(fs.readFile)

export async function open_zip(filename: string) {
	const data = await read_file(filename)
	const file = await JSZip.loadAsync(data)
	return file
}
