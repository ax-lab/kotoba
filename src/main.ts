import { version } from './lib'
import * as mpv from './mpv'

async function main() {
	const close = await mpv.open()
	setTimeout(close, 3000)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
