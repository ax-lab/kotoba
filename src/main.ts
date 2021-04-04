import { MPV } from './mpv'
import { start_server } from './server'

const DEBUG_IPC = false
const DEBUG_LOG = false
const DEBUG_PLAY = false
const SHOW_PLAYER = false
const START_SERVER = true

async function main() {
	const player = MPV.get()

	player.on('connect', () => {
		console.log('IPC: connected')
	})

	player.on('disconnect', () => console.log('IPC: disconnected'))

	player.on('ipc', (data) => {
		if (DEBUG_IPC) {
			if ((data as { event?: string }).event == 'log-message' && !DEBUG_LOG) {
				return
			}
			console.log('IPC:', JSON.stringify(data))
		}
	})

	player.on('ipc_send', (data) => {
		if (DEBUG_IPC) {
			console.log('IPC: [SEND] -', JSON.stringify(data))
		}
	})

	player.on('log', (log) => {
		if (['debug', 'v', 'trace'].indexOf(log.level) >= 0 && !DEBUG_LOG) {
			return
		}
		console.log('LOG:', log.level, log.prefix, log.text)
	})

	player.on('output', (line) => {
		if (DEBUG_LOG) {
			console.log(`OUT: ${line}`)
		}
	})

	player.on('error', (line) => console.error(`ERR: ${line.toString()}`))

	player.on('playback', (playback) => {
		if (!DEBUG_PLAY) {
			return
		}
		if (playback) {
			console.log('PLAYBACK:', playback)
		} else {
			console.log('PLAYBACK: FINISHED')
		}
	})

	if (SHOW_PLAYER) {
		player.open()
	}

	if (START_SERVER) {
		start_server()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
