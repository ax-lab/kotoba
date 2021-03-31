import { version } from './lib'
import * as mpv from './mpv'

async function main() {
	await mpv.open()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
