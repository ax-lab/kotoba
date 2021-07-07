import * as os from 'os'
import * as path from 'path'
import { Worker } from 'worker_threads'

import { elapsed, now } from '../../lib'

type Job = {
	id: number
	db: string
	sql: string
	params?: unknown
	resolve: (data: unknown) => void
	reject: (error: Error) => void
}

const DB_TIMEOUT_MS = 5000
const DB_MIN_WORKERS = 4
const DB_MAX_WORKERS = 16

const db_queue: Job[] = []
const db_workers: Array<() => boolean> = []

const worker_start = now()
let worker_id = 0

function spawn_worker() {
	let job: Job | null = null

	const worker = new Worker(path.join(__dirname, './db_worker.js'), {
		workerData: { id: (++worker_id).toString().padStart(2, '0') },
	})

	const take_job = () => {
		if (!job && db_queue.length) {
			job = db_queue.shift()!
			worker.postMessage({
				id: job.id,
				file: job.db,
				sql: job.sql,
				params: job.params,
			})
			return true
		}
		return false
	}

	worker.on('online', () => {
		db_workers.push(take_job)
		if (db_workers.length == worker_id) {
			console.log(`DB: spawned ${worker_id} workers in ${elapsed(worker_start)}`)
		}
		take_job()
	})

	worker.on('message', (data: unknown) => {
		process.nextTick(drain_queue)
		job!.resolve(data)
		job = null
	})

	worker.on('error', (err: Error) => {
		process.nextTick(drain_queue)
		if (job) {
			job.reject(err)
		} else {
			console.error('DB worker error', err)
		}
		job = null
	})

	worker.on('exit', (code: number) => {
		const index = db_workers.findIndex((x) => x == take_job)
		if (index >= 0) {
			db_workers.splice(index, 1)
		}
		if (job) {
			job.reject(new Error(`worker exited with code ${code}`))
			job = null
		}
		if (code != 0) {
			console.error(`DB worker exited with code ${code}`)
			spawn_worker() // keep the number of available workers
		}
	})
}

function drain_queue() {
	for (const take_job of db_workers) {
		take_job()
	}
}

;(function () {
	const num_workers = Math.min(Math.max(DB_MIN_WORKERS, os.cpus().length), DB_MAX_WORKERS)
	for (let i = 0; i < num_workers; i++) {
		spawn_worker()
	}
})()

export default class DB {
	// #region Instance management

	static db_hot = new Set<string>()

	static async get_dict() {
		return await DB.get('dict.db')
	}

	private readonly name: string

	private constructor(name: string) {
		this.name = name
	}

	/**
	 * Returns a shared database instance for the given file, opening it if
	 * necessary.
	 */
	static async get(name: string) {
		const out = new DB(name)
		return out
	}

	// #endregion

	static id = 0

	async query<T = Record<string, string>>(sql: string, params?: unknown) {
		const id = ++DB.id
		return new Promise<T[]>((resolve, reject) => {
			const job: Job = {
				db: this.name,
				id,
				sql,
				params,
				resolve: (data) => {
					ok()
					resolve(data as T[])
				},
				reject: (error) => {
					ok()
					reject(error)
				},
			}

			// Timeout:

			const to = setTimeout(() => {
				const index = db_queue.indexOf(job)
				if (index >= 0) {
					db_queue.splice(index, 1)
				}
				reject(new Error(`SQL query timed out after ${DB_TIMEOUT_MS}ms`))
			}, DB_TIMEOUT_MS)

			const ok = () => clearTimeout(to)

			// Post the job
			db_queue.push(job)
			drain_queue()
		})
	}
}
