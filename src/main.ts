import { Player } from './player'
import { start_server } from './server'

const START_SERVER = true

async function main() {
	Player.events.on('exit', (error) => console.log('Player closed', error ? error : ''))

	if (START_SERVER) {
		start_server()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
