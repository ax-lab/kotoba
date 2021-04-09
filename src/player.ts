import { ChildProcess, spawn } from 'child_process'
import EventEmitter from 'events'
import fs from 'fs'
import net from 'net'
import path from 'path'

import { PlaybackInfo, SubtitleLine } from '../lib'

const DEBUG_IPC = true // debug IPC connection and messages
const DEBUG_IPC_LOG = false // also include extremely verbose log messages

// Player executable location
const BIN_DIR = `bin`
const MPV_EXE = `mpv.exe`

// Timeout on the IPC connection attempt after the player process spawns
const IPC_CONN_TIMEOUT_MS = 5000

// Minimum initial delay and interval between `playback` events.
const PLAYBACK_THROTTLE_MS = 50
const PLAYBACK_DELAY_MS = 10

// Name for the socket used for IPC
const IPC_PIPE = 'mpv-kotoba-control'

// Arguments for the player
const MPV_ARGS = [
	'--quiet',
	'--idle=yes',
	'--ontop', //spell-checker: ignore ontop
	'--keep-open=yes',
	'--force-window=yes',
	'--no-resume-playback',
	`--input-ipc-server=${IPC_PIPE}`,
]

// Events on this interface are injected into the Player type. This is just to
// document and to provide static typing for those.
interface PlayerEvents {
	/** Event generated for each line in the standard output. */
	output: (line: string) => void

	/**
	 * Event generated for player errors. Those includes any line on stderr and
	 * other internal errors.
	 *
	 * This is meant mostly to log errors, and not for actual error handling
	 * logic.
	 */
	error: (reason: string, error?: Error) => void

	/** Player process has been closed (or failed to spawn). */
	exit: (error?: Error) => void

	/** This is called for any property change on the player. */
	change: (property: string, value: unknown) => void

	/**
	 * Similar to change, this is called for property changes, but those related
	 * to playback (which are basically most of them).
	 *
	 * What makes this different is that it provides a more convenient interface
	 * by providing all properties in a `PlaybackInfo` object.
	 *
	 * Also, as opposed to `change` which is generated immediately and for
	 * each property changed, the `playback` event is throttled for performance
	 * reasons and can combine multiple property changes.
	 */
	playback: (info: PlaybackInfo) => void
}

// Inject "PlayerEvents" into the Player class.
export interface Player {
	on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this
	once<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this

	emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): boolean
}

interface GlobalPlayerEvents extends EventEmitter {
	on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this
	once<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this
	emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): boolean
}

/**
 * Player controls an instance of the MPV player.
 */
export abstract class Player extends EventEmitter {
	/**
	 * Provides access to player events globally, independent of the active
	 * instance.
	 *
	 * This is useful to handle player events without independently of the
	 * player current state.
	 */
	static readonly events: GlobalPlayerEvents = new EventEmitter()

	// We don't want this class to be instantiated directly. All setup is done
	// through the PlayerController derived class.
	protected constructor() {
		super()
	}

	emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>) {
		;(Player.events as EventEmitter).emit(event, ...args)
		return super.emit(event, ...args)
	}

	protected has_exit = false

	// The singleton instance of this class. We only want one player to be
	// active at any given point.
	static _player?: Player

	/**
	 * Returns the active player instance, if any. This will not spawn the
	 * player if it is not open already.
	 */
	static get current() {
		return this._player && !this._player.has_exit ? this._player : undefined
	}

	/**
	 * Returns the active player instance, if any, or spawn a new player process.
	 */
	static async open(): Promise<Player> {
		if (!this._player) {
			const player = await spawn_mpv()
			player.once('exit', () => {
				this._player = undefined
			})
			player.on('error', (err) => {
				console.error('ERR:', 'player error:', err)
			})

			void player.send_command('request_log_messages', 'debug') // request full logging
			this._player = player
		}
		return this._player
	}

	// those need to be initialized before the properties, since those are
	// used by them internally
	private properties = new Map<string, { value?: unknown } & EventEmitter>()
	private cmd_pending = new Map<number, (msg: MsgResponse | null, err?: string) => void>()
	private cmd_counter = 0

	/*=========================================================================*
	 * Properties & methods
	 *=========================================================================*/

	/** Returns true if any file is open  */
	get has_file() {
		return !!this.file_name.value
	}

	/** Currently open filename without path. */
	readonly file_name = this.property<string>('filename')

	/** Fullpath for the currently open file. */
	readonly file_path = this.property<string>('path')

	/** Length of the current file in bytes */
	readonly file_size = this.property<number>('file-size')

	private _media_path = ''

	/**
	 * The media path for the currently open file. The media path is a virtual
	 * path name that is controlled by the media settings, and is not the same
	 * as the file path.
	 */
	get media_path() {
		return this._media_path
	}

	/** Title tag for the current file, or `filename` if not available. */
	readonly title = this.property<string>('media-title')

	/** Current playback position in seconds. */
	readonly position = this.property<number>('playback-time')

	/** Duration of the file in seconds */
	readonly duration = this.property<number>('duration')

	/** Is the playback paused? */
	readonly paused = this.property<boolean>('pause')

	/** Current subtitle text */
	readonly sub_text = this.property<string>('sub-text')

	/** Current subtitle start time in seconds */
	readonly sub_start = this.property<number>('sub-start')

	/** Current subtitle end time in seconds */
	readonly sub_end = this.property<number>('sub-end')

	/** First looping point */
	readonly ab_loop_a = this.property<number | 'no'>('ab-loop-a')

	/** Second looping point */
	readonly ab_loop_b = this.property<number | 'no'>('ab-loop-b')

	/** Return true if the player is looping. */
	get is_looping() {
		const a = this.ab_loop_a.value
		const b = this.ab_loop_b.value
		return a && b && a != 'no' && b != 0
	}

	/** Chapter title */
	readonly chapter_title = this.property<string>('chapter-metadata/by-key/title')

	private _subtitle_id?: number
	private _subtitle_file?: string
	private _subtitle_name?: string

	/**
	 * Full path to the currently loaded subtitle file. This is only available
	 * if the subtitle has been loaded through the player interface.
	 */
	get subtitle_file() {
		return this._subtitle_file
	}

	/**
	 * User given name for the current subtitle file. Same as `subtitle_file`
	 * this is only available if the subtitle has been loaded through the
	 * player interface.
	 */
	get subtitle_name() {
		return this._subtitle_name
	}

	get playback_info(): PlaybackInfo {
		const sub_text = this.sub_text.value
		const sub_start = this.sub_start.value
		const sub_end = this.sub_end.value
		const sub: SubtitleLine | undefined =
			sub_text && sub_start != null && sub_end != null && sub_end > sub_start
				? { text: sub_text, start: sub_start, end: sub_end }
				: undefined

		const loop_a = this.ab_loop_a.value
		const loop_b = this.ab_loop_b.value
		return {
			chapter: this.chapter_title.value,
			duration: this.duration.value,
			file_name: this.file_name.value,
			file_path: this.file_path.value,
			file_size: this.file_size.value,
			loop_a: loop_a != null && loop_a != 'no' ? loop_a : undefined,
			loop_b: loop_b != null && loop_b != 'no' ? loop_b : undefined,
			media_path: this.media_path,
			paused: this.paused.value,
			position: this.position.value,
			subtitle: sub,
			title: this.title.value,
		}
	}

	/**
	 * Opens a file in the player.
	 */
	async open_file(filename: string, { media_path = '', paused = false } = {}) {
		const main = this.send_command('loadfile', filename)
		const pause = paused && this.paused.set(true)

		const success = (await main).success
		if (success) {
			this._media_path = media_path
		}
		if (success && pause) {
			await pause
		}
		return success
	}

	/**
	 * Loads a subtitle.
	 */
	async load_subtitle(filename: string, { name = '', label = '' } = {}) {
		if (this._subtitle_file) {
			// remove the active subtitle if it was one of our own
			void this.send_command('sub-remove', this._subtitle_id)
		}

		// add the subtitle file
		const res = await this.send_command('sub-add', filename, 'select', label || 'Kotoba')
		if (res.success) {
			// retrieve the id so that we can remove it later
			const sub = await this.get_property<number>('sub')
			this._subtitle_file = filename
			this._subtitle_name = name
			this._subtitle_id = sub
			this.trigger_playback()
		}
		return res.success
	}

	/**
	 * Closes the player.
	 */
	async close() {
		const res = await this.send_command('quit')
		return res.success
	}

	/**
	 * Resumes playback.
	 */
	async play() {
		return await this.paused.set(false)
	}

	/**
	 * Pauses playback.
	 */
	async pause() {
		return await this.paused.set(true)
	}

	/**
	 * Seek to the position in the file.
	 */
	async seek(position: number, { absolute = true } = {}) {
		const res = await this.send_command('seek', position, absolute ? 'absolute' : 'relative')
		return res.success
	}

	/**
	 * Starts a playback loop between the two given positions. Giving negative
	 * or equal values to `a` and `b` will stop looping.
	 */
	async loop(a: number | undefined, b: number | undefined, { seek = false } = {}) {
		let ok = true
		if (a == null || b == null || a == b) {
			const set_a = this.ab_loop_a.set('no')
			const set_b = this.ab_loop_b.set('no')
			ok &&= await set_a
			ok &&= await set_b
		} else {
			if (a > b) {
				const c = a
				a = b
				b = c
			}
			const set_a = this.ab_loop_a.set(a)
			const set_b = this.ab_loop_b.set(b)
			const set_p = seek && this.seek(a)
			ok &&= await set_a
			ok &&= await set_b
			ok &&= await set_p
		}
		return ok
	}

	/*=========================================================================*
	 * Private implementation
	 *=========================================================================*/

	protected async get_property<T>(name: string) {
		const res = await this.send_command('get_property', name)
		return res.success && res.data ? (res.data as T) : undefined
	}

	/** Send a command to the player */
	protected async send_command(name: string, ...args: unknown[]) {
		return this.do_send_command(false, name, ...args)
	}

	/**
	 * Send an async command to the player. Async here is in respect to the
	 * player itself. Asynchronous commands can be executed out of order and
	 * don't block other commands.
	 */
	protected async send_command_async(name: string, ...args: unknown[]) {
		return this.do_send_command(true, name, ...args)
	}

	// This is the method that actually writes data to the IPC socket. We
	// abstract this away because this is managed by PlayerController.
	protected abstract write_to_socket(data: string): void

	/**
	 * Sends a command to the connected player instance.
	 *
	 * Commands are written to the socket one per line encoded as JSON. For the
	 * most part, execution of non-async commands is serialized, since those
	 * are sent in order. This means, that even if execution and response are
	 * asynchronous (even for non-async), the order of execution is preserved.
	 *
	 * Each command is given an incremental ID which is sent back by the player
	 * alongside the command result. The promise for a command will only be
	 * resolved once that message is received.
	 */
	private do_send_command(async: boolean, name: string, ...args: unknown[]): Promise<CmdResult | CmdError> {
		return new Promise<CmdResult | CmdError>((resolve) => {
			// Generate a unique ID for the command. The id is included in the
			// response from the player.
			const id = ++this.cmd_counter
			const cmd = { command: [name, ...args], request_id: id, ...(async ? { async: true } : {}) }
			const cmd_text = JSON.stringify(cmd)

			// The socket protocol is entirely asynchronous. This callback will
			// be called when we receive a response message with the command id.
			this.cmd_pending.set(id, (msg, err) => {
				if (err) {
					this.emit('error', `command failed: ${err} (id=${id}, cmd=${cmd_text})`)
				}

				if (err) {
					resolve({ success: false, error: err })
				} else {
					resolve({ success: true, ...(msg?.data && { data: msg.data }) })
				}
			})

			if (DEBUG_IPC) {
				console.log(`IPC: SEND ->`, cmd_text)
			}

			// Send the command to the player.
			this.write_to_socket(cmd_text + '\n')
		})
	}

	/**
	 * This is called whenever a message is received on the IPC channel.
	 */
	protected handle_msg(msg: PlayerMsg) {
		if (DEBUG_IPC) {
			// Handle log messages apart, since those can be very verbose
			let debug = true
			if (is_event(msg) && !DEBUG_IPC_LOG) {
				debug = msg.level != 'v' && msg.level != 'debug' && msg.level != 'trace'
			}
			debug && console.log('IPC:', JSON.stringify(msg))
		}

		if (is_response(msg)) {
			// Handle the response to a command.
			const err = msg.error && msg.error != 'success' ? msg.error : undefined
			delete msg.error

			const id = msg.request_id
			const cb = this.cmd_pending.get(id)
			this.cmd_pending.delete(id)
			cb && cb(msg, err)
		}

		if (is_event(msg)) {
			switch (msg.event) {
				// Emit a change event for any registered property
				case 'property-change': {
					const prop = this.properties.get(msg.name)
					if (prop) {
						prop.value = msg.data
						prop.emit('change', msg.data)
					}

					// Also emit a player-level change event. Note that only
					// observed properties will generate events.
					this.emit('change', msg.name, msg.data)

					// Also trigger the playback event.
					this.trigger_playback()
					break
				}

				// Handle the IPC being disconnected. This will most likely
				// only happen when the player is closed. (and if for any reason
				// the socket is closed without the player being closed, the
				// process will be killed anyway).
				case 'ipc-disconnect': {
					// We already generate a 'exit' event on the process exit,
					// and disconnect will cause the process to be killed if it
					// does not end by itself. The only thing we need to do is
					// resolve any pending commands.
					for (const callback of this.cmd_pending.values()) {
						callback(null, 'player disconnected')
					}
					this.cmd_pending.clear()
				}
			}
		}
	}

	private last_playback?: number
	private next_playback?: NodeJS.Timeout

	/**
	 * Trigger a playback event. The playback event is similar to `change` but
	 * provides a more convenient interface to access all the playback info.
	 *
	 * As opposed to change which is triggered immediately, this event is
	 * throttled to improve performance in handlers. As such, this method will
	 * not necessarily trigger the event immediately.
	 */
	protected trigger_playback() {
		if (this.next_playback) {
			return // already triggered
		}

		const now = new Date().getTime()
		const delta = now - (this.last_playback || -1)
		if (delta > PLAYBACK_THROTTLE_MS) {
			this.last_playback = now
			this.next_playback = setTimeout(() => {
				this.next_playback = undefined
				this.emit('playback', this.playback_info)
			}, PLAYBACK_DELAY_MS)
		}
	}

	/**
	 * Sets up an observable property on the player and returns an object that
	 * can be used to interact with it.
	 *
	 * Multiple calls using the same name will return the same object. It is the
	 * caller's responsability to ensure the property type is correct.
	 */
	private property<T>(property_name: string) {
		const properties = this.properties
		if (!properties.has(property_name)) {
			const id = properties.size + 1
			const field: { value?: T } & EventEmitter = new EventEmitter()

			void this.send_command('observe_property', id, property_name)
			properties.set(property_name, field)
		}

		const field = properties.get(property_name)!

		const player = this
		return {
			name: property_name,

			get value() {
				return field.value !== undefined ? (field.value as T) : undefined
			},

			set(value: T) {
				return player.send_command('set_property', property_name, value).then((x) => {
					if (x.success) {
						// if the update was successful, update immediately so
						// that the client sees the new value
						field.value = value
					}
					return x.success
				})
			},

			watch(callback: (value: T) => void) {
				field.on('change', callback)
				return () => field.removeListener('change', callback)
			},
		}
	}
}

/**
 * Internal instance used to update the Player state without exposing the
 * private API.
 *
 * This extends from Player to have access to the internals of the class.
 */
class PlayerController extends Player {
	readonly process: ChildProcess

	private socket?: net.Socket

	constructor(process: ChildProcess) {
		super()
		this.process = process
	}

	// On socket disconnect, we start a kill timer to ensure the process will
	// be killed. The process will most likely close by itself, but we don't
	// want to have a disconnected player instance.
	private _kill_timer?: NodeJS.Timer

	// Before a socket connection is established, commands are queued here.
	private _exec_queue?: Array<() => void>

	/**
	 * Create the player using the given socket. This is called by the IPC setup
	 * once the socket has finished connection.
	 */
	open_socket(socket: net.Socket) {
		this.socket = socket

		// Execute all queued commands
		if (this._exec_queue) {
			for (const exec of this._exec_queue) {
				exec()
			}
			this._exec_queue.length = 0
		}
	}

	/**
	 * Executes the callback once the player is ready and connected. If the
	 * player is connected, the callback is executed immediately.
	 */
	exec(fn: () => void) {
		if (this.socket) {
			fn()
		} else {
			this._exec_queue = this._exec_queue || []
			this._exec_queue.push(fn)
		}
	}

	// Abstract method from Player.
	write_to_socket(data: string) {
		this.exec(() => this.socket!.write(data))
	}

	/**
	 * Handles an IPC message. This is called directly from the socket handler.
	 */
	on_ipc(msg: PlayerMsg) {
		if (is_event(msg)) {
			switch (msg.event) {
				case 'ipc-disconnect':
					// This event is explicitly generated by the socket close
					// handler.
					//
					// If the socket disconnected, the most likely reason is
					// that the player is closing / has closed. Even so, we
					// don't want to risk a disconnected zombie player instance,
					// so we forcefully kill the process if it does not close
					// by itself.
					this._kill_timer = setTimeout(() => this.process.kill(), 2000)
			}
		}

		// The disconnect can be generated without a socket, so we need to
		// protect this.
		this.exec(() => this.handle_msg(msg))
	}

	/**
	 * Called for each complete line in the stdout stream.
	 */
	push_stdout(line: string) {
		this.exec(() => this.emit('output', line))
	}

	/**
	 * Called for each complete line in the stderr stream.
	 */
	push_stderr(line: string) {
		this.exec(() => this.emit('error', line))
	}

	/**
	 * This is called by the process exit or error events.
	 */
	on_exit(error?: Error) {
		// Clear the kill timeout since the process exited
		this._kill_timer && clearTimeout(this._kill_timer)

		// Emit an `exit` event for player clients
		if (!this.has_exit) {
			this.has_exit = true
			this.exec(() => this.emit('exit', error))
		}
	}
}

/*=============================================================================*
 * IPC protocol types
 *=============================================================================*/

function is_event(x: Msg): x is MsgEvent {
	return 'event' in x
}

function is_response(x: Msg): x is MsgResponse {
	return 'request_id' in x
}

type CmdError = {
	success: false
	error: string
}

type CmdResult = {
	success: true
	data?: Record<string, unknown>
}

/** This contains all recognized player messages. */
type PlayerMsg = MsgResponse | MsgEvents

/** This contains all recognized player events. */
type MsgEvents = MsgEventPropertyChange | MsgEventDisconnect | MsgEventLog

/** Generic JSON message received through IPC. */
interface Msg {
	[key: string]: unknown
}

/** Generic event message received through IPC. */
type MsgEvent = {
	event: string
} & Msg

/** Response to a command. */
type MsgResponse = {
	request_id: number
	data?: Record<string, unknown>
	error?: 'success' | string
} & Msg

/**
 * This is generated by the socket on our side and is not part of the MPV
 * protocol. Note that can be multiple of this.
 */
type MsgEventDisconnect = {
	event: 'ipc-disconnect'
	error?: Error
} & MsgEvent

/**
 * Event generated on property changes.
 */
type MsgEventPropertyChange = {
	event: 'property-change'
	id: number
	name: string
	data: unknown
} & MsgEvent

/**
 * Event generated on log messages.
 */
type MsgEventLog = {
	event: 'log-message'
	prefix: string

	/**
	 * Message level
	 *
	 * - `error` - simple errors
	 * - `warn`  - possible problems
	 * - `info`  - informational message
	 * - `v`     - noisy informational message
	 * - `debug` - very noisy technical information
	 * - `trace` - extremely noisy
	 */
	level: 'error' | 'warn' | 'info' | 'v' | 'debug' | 'trace'

	text: string
} & MsgEvent

/*=============================================================================*
 * Process spawning & IPC
 *=============================================================================*/

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

/**
 * Spawn a new Player process.
 */
function spawn_mpv() {
	return new Promise<Player>((resolve_promise, reject_promise) => {
		let resolved = false

		const resolve = (player: Player) => {
			resolve_promise(player)
			resolved = true
		}

		const reject = (err: Error) => {
			reject_promise(err)
			resolved = true
		}

		/* Spawn the process
		 *---------------------------------------------------------------------*/

		const exe = mpv_path
		if (!exe) {
			reject(new Error(`MPV executable not found (please ensure 'bin/mpv.exe' is on the server directory)`))
			return
		}

		const process = spawn(mpv_path, MPV_ARGS)
		const player = new PlayerController(process)

		if (DEBUG_IPC) {
			console.log(`DBG: player process spawned with pid ${process.pid}`)
		}

		/* Connect through IPC
		 *---------------------------------------------------------------------*/

		// We don't have a good way to know when the IPC will be ready, so we
		// just try it until it connects or we time it out.
		const start = new Date().getTime()
		let ipc_open = setTimeout(try_open_ipc, 50)

		/* Handle process output
		 *---------------------------------------------------------------------*/

		const on_output = (data: string, out: { text: string; err?: boolean }) => {
			// Handle the output from the process line by line. Any output on
			// stderr is handled as an error.
			out.text += data
			while (true) {
				const m = /[\n\r]/.exec(out.text)
				const pos = m ? m.index : -1
				if (pos >= 0) {
					const line = out.text.slice(0, pos)
					out.text = out.text.slice(pos + 1)
					if (line.trim()) {
						if (out.err) {
							player.push_stderr(line)
						} else {
							player.push_stdout(line)
						}
					}
				} else {
					break
				}
			}
		}

		// Buffer the process output until we receive a whole line.
		const stdout = { text: '' }
		const stderr = { text: '', err: true }

		type Data = { toString(): string }
		process.stdout.on('data', (data: Data) => on_output(data.toString(), stdout))
		process.stderr.on('data', (data: Data) => on_output(data.toString(), stderr))

		/* Handle process events
		 *---------------------------------------------------------------------*/

		const on_exit = (code: number | null, err?: Error) => {
			// Emit any remaining output
			if (stdout.text.trim()) {
				player.push_stdout(stdout.text)
			}
			if (stderr.text.trim()) {
				player.push_stderr(stdout.text)
			}

			// Stop trying to connect IPC
			clearTimeout(ipc_open)

			if (code) {
				// any non-zero code is considered an error exit
				err = err || new Error(`player process exited with code ${code}`)
			}

			if (err) {
				if (resolved) {
					player.on_exit(err)
				} else {
					reject(err)
				}
			} else {
				if (resolved) {
					player.on_exit()
				} else {
					// Consider an error if the player closed before we could
					// establish a connection
					reject(new Error(`player process exited`))
				}
			}
		}

		process.on('exit', (code) => {
			on_exit(code)
		})

		process.on('error', (err) => {
			on_exit(null, err)
		})

		/* IPC connection
		 *---------------------------------------------------------------------*/

		function try_open_ipc() {
			const now = new Date()
			if (now.getTime() - start > IPC_CONN_TIMEOUT_MS) {
				reject(new Error(`could not connect to player: timeout exceeded (${IPC_CONN_TIMEOUT_MS}ms)`))
				process.kill() // make sure the process does not stay around
				return
			}

			// Note that this promise should never reject, except for bugs in the code.
			void connect_to_mpv((msg) => {
				player.on_ipc(msg)
			}).then((socket) => {
				if (socket) {
					player.open_socket(socket)
					resolve(player)
				} else {
					// The socket connection failed, so just try again.
					//
					// We Ignore errors at this point since they are
					// most likely because the IPC is not ready yet.
					ipc_open = setTimeout(try_open_ipc, 200)
				}
			})
		}

		function connect_to_mpv(on_message: (msg: PlayerMsg) => void) {
			return new Promise<net.Socket | null>((resolve, reject) => {
				try {
					const ADDR = `\\\\.\\pipe\\${IPC_PIPE}`
					if (DEBUG_IPC) {
						console.log(`DBG: attempting IPC connection to ${ADDR}`)
					}

					const socket = net.connect(ADDR)

					let resolved = false
					socket.once('connect', () => {
						DEBUG_IPC && console.log(`DBG: socket connected`)
						resolved = true
						resolve(socket)
					})

					socket.once('close', () => {
						DEBUG_IPC && console.log(`DBG: socket closed`)
						if (resolved) {
							on_message({ event: 'ipc-disconnect' })
						}
					})

					socket.once('error', (err) => {
						DEBUG_IPC && console.log(`DBG: socket error`, err)
						if (!resolved) {
							// Resolve with a null to indicate the connection
							// failed.
							//
							// We ignore errors at this point and just try
							// again since it most likely that the IPC channel
							// is not ready yet.
							resolve(null)
						} else {
							on_message({ event: 'ipc-disconnect', error: err })
						}
					})

					// The IPC protocol is line based. Each line contains a JSON record.
					let buffer = ''
					socket.on('data', (data) => {
						buffer += data.toString()
						for (let p = buffer.indexOf('\n'); p >= 0; p = buffer.indexOf('\n')) {
							const line = buffer.slice(0, p)
							buffer = buffer.slice(p + 1)
							try {
								on_message(JSON.parse(line) as PlayerMsg)
							} catch (err) {
								// ignore invalid messages but emit the error on the console
								console.warn(`error parsing IPC message: ${line}`, err)
							}
						}
					})
				} catch (err) {
					if (DEBUG_IPC) {
						console.log(`DBG: connection failed`, err)
					}
					reject(err)
				}
			})
		}
	})
}
