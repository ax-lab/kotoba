import { ChildProcess, spawn } from 'child_process'
import EventEmitter from 'events'
import fs from 'fs'
import net from 'net'
import path from 'path'

const BIN_DIR = `bin`
const MPV_EXE = `mpv.exe`

// Find the `mpv.exe` executable
const mpv_path = (() => {
	let base = path.normalize(path.dirname(__filename))
	while (base) {
		const mpv_path = path.join(base, BIN_DIR, MPV_EXE)
		try {
			const mpv_stat = fs.statSync(mpv_path)
			if (mpv_stat.isFile()) {
				return mpv_path
			}
		} catch (e) {
			// ignore error
		}
		const parent = path.normalize(path.join(base, '..'))
		if (parent != base) {
			base = parent
		} else {
			break
		}
	}
	return ''
})()

if (mpv_path) {
	console.log(`Found player at ${mpv_path}`)
} else {
	console.error(`Could not find mpv player, aborting`)
	console.error(`Expected '${path.join(BIN_DIR, MPV_EXE)}' in the script directory or parent directories`)
	console.error(``)
	process.exit(1)
}

const IPC_PIPE = 'mpv-kotoba-control'

export class MPV extends EventEmitter {
	static _main: MPV

	private constructor() {
		super()
	}

	static get() {
		if (!MPV._main) {
			MPV._main = new MPV()
		}
		return MPV._main
	}

	_process?: ChildProcess
	_socket?: net.Socket

	_connected = false

	/** Returns if the MPV player instance is open. */
	get is_open() {
		return !!this._process
	}

	/** Opens the MPV player instance if not open. */
	async open() {
		if (!this.is_open) {
			const ps = spawn(mpv_path, [
				'--quiet',
				'--idle=yes',
				'--keep-open=yes',
				'--force-window=yes',
				'--no-resume-playback',
				`--input-ipc-server=${IPC_PIPE}`,
			])
			this._process = ps

			const interval = setInterval(() => this.try_connect(), 500)

			type Data = { toString(): string }
			ps.stdout.on('data', (data: Data) => this.on_output(false, data.toString()))
			ps.stderr.on('data', (data: Data) => this.on_output(true, data.toString()))
			ps.on('exit', (code) => {
				this._process = undefined
				this._socket = undefined
				this._connected = false
				clearInterval(interval)
				if (code) {
					this.emit('error', `player exited with code ${code}`)
				}
			})

			setTimeout(() => this.try_connect(), 20)
		}
	}

	public send_command(value: unknown) {
		if (this._socket) {
			try {
				this._socket.write(JSON.stringify(value) + '\n')
			} catch (e) {
				this.emit('error', e)
			}
		}
	}

	private try_connect() {
		if (this._socket || !this._process) {
			return
		}
		try {
			const socket = net.connect(`\\\\.\\pipe\\${IPC_PIPE}`)
			this._socket = socket

			socket.on('connect', () => {
				this._connected = true
				this.emit('connect')
			})

			socket.on('close', () => {
				this._socket = undefined
				if (this._connected) {
					this._connected = false
					this.emit('disconnect')
				}
			})

			socket.on('error', (err) => {
				if (this._connected) {
					this.emit('error', err)
				}
			})

			let buffer = ''
			socket.on('data', (data) => {
				buffer += data.toString()
				for (let p = buffer.indexOf('\n'); p >= 0; p = buffer.indexOf('\n')) {
					const line = buffer.slice(0, p)
					buffer = buffer.slice(p + 1)
					try {
						const response = JSON.parse(line) as unknown
						this.on_ipc(response)
					} catch (e) {
						// ignore errors
					}
				}
			})

			socket.on('end', () => {
				this._connected = false
				this.emit('disconnect')
			})

			return true
		} catch (e) {
			return false
		}
	}

	private on_ipc(data: unknown) {
		this.emit('data', data)
	}

	_stdout = { text: '' }
	_stderr = { text: '' }

	private on_output(err: boolean, data: string) {
		const out = err ? this._stderr : this._stdout
		out.text += data
		while (true) {
			const m = /[\n\r]/.exec(out.text)
			const pos = m ? m.index : -1
			if (pos >= 0) {
				const line = out.text.slice(0, pos)
				out.text = out.text.slice(pos + 1)
				if (line.trim()) {
					this.emit(err ? 'error' : 'output', line)
				}
			} else {
				break
			}
		}
	}
}
