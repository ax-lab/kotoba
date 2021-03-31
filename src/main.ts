import { MPV } from './mpv'
import { start_server } from './server'

const SHOW_PLAYER = false

async function main() {
	const player = MPV.get()

	player.on('connect', () => {
		console.log('IPC connected')
		player.send_command({ command: ['request_log_messages', 'debug'], async: true })
	})

	player.on('disconnect', () => console.log('IPC disconnected'))

	player.on('data', (data) => console.log('RECV', JSON.stringify(data)))

	player.on('output', (line) => console.log(`OUT: ${line}`))

	player.on('error', (line) => console.error(`ERR: ${line}`))

	if (SHOW_PLAYER) {
		await player.open()
	}

	start_server()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
