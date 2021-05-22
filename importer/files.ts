import fs from 'fs'
import { promisify } from 'util'

import JSZip from 'jszip'

const fs_read_file = promisify(fs.readFile)
const fs_mkdir = promisify(fs.mkdir)
const fs_stat = promisify(fs.stat)
const fs_unlink = promisify(fs.unlink)

export async function open_zip(filename: string) {
	const data = await fs_read_file(filename)
	const file = await JSZip.loadAsync(data)
	return file
}

export async function read_lines(filename: string) {
	const data = await fs_read_file(filename, 'utf-8')
	return data.split(/\n|\r\n?/)
}

export function split_lines(text: string) {
	return text.split(/\n|\r\n?/).filter((x) => !!x.trim())
}

export async function mkdir(dir: string) {
	try {
		await fs_mkdir(dir, { recursive: true })
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code != 'EEXIST') {
			throw err
		}
	}
}

export async function remove_file(file: string) {
	try {
		await fs_unlink(file)
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code != 'ENOENT') {
			throw err
		}
	}
}

export async function file_exists(filename: string) {
	const info = await stat(filename)
	return info && info.isFile()
}

export async function stat(...args: Parameters<typeof fs_stat>) {
	try {
		return await fs_stat(...args)
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code != 'ENOENT') {
			throw err
		}
	}
	return null
}
