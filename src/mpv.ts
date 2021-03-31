import fs from 'fs'
import net from 'net'
import path from 'path'

import { spawn } from 'child_process'

const BIN_DIR = `bin`
const MPV_EXE = `mpv.exe`

// Find the `mpv.exe` executable
const mpv = (() => {
	let base = path.normalize(path.dirname(__filename))
	while (base) {
		const mpv_path = path.join(base, BIN_DIR, MPV_EXE)
		try {
			const mpv_stat = fs.statSync(mpv_path)
			if (mpv_stat.isFile()) {
				return mpv_path
			}
		} catch (e) {}
		const parent = path.normalize(path.join(base, '..'))
		if (parent != base) {
			base = parent
		} else {
			break
		}
	}
	return ''
})()

if (mpv) {
	console.log(`Found player at ${mpv}`)
} else {
	console.error(`Could not find mpv player, aborting`)
	console.error(`Expected '${path.join(BIN_DIR, MPV_EXE)}' in the script directory or parent directories`)
	console.error(``)
	process.exit(1)
}

export async function open() {
	const ps = spawn(mpv, [
		'--idle=yes',
		'--keep-open=yes',
		'--force-window=yes',
		'--no-resume-playback',
		'--input-ipc-server=mpv-kotoba-control',
	])

	ps.stdout.on('data', (data) => {
		console.log(data.toString())
	})
	ps.stderr.on('data', (data) => {
		console.error(data.toString())
	})
	ps.on('exit', (code) => {
		console.log(`\nPlayer exited with code ${code}`)
	})

	setTimeout(() => {
		console.log('Opening IPC connection...')
		try {
			const socket = net.connect('\\\\.\\pipe\\mpv-kotoba-control')
			console.log('Connected!')
			socket.on('data', (data) => {
				console.log('SOCKET:', data.toString())
			})
			socket.on('end', () => {
				console.log('Connection ended!')
			})
			socket.write(`{ "command": ["client_name"], "async": true }\n`)
			socket.write(`{ "command": ["request_log_messages", "debug"], "async": true }\n`)
			console.log('Command sent!')
		} catch (e) {
			console.error('Socket', e)
		}
	}, 1000)

	return () => {
		try {
			ps.kill()
		} catch (e) {}
	}
}
