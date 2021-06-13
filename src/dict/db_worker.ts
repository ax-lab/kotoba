import * as path from 'path'
import { parentPort, workerData } from 'worker_threads'

import sqlite from 'better-sqlite3'

const DEBUG = false

const DATA_DIR = path.join('.', 'data')

const dbs = new Map<string, sqlite.Database>()

/**
 * Any databases that we want preloaded by all workers.
 */
const PRELOAD: string[] = ['dict.db']

const { id } = workerData as { id: string }

DEBUG && console.log(`DB worker ${id}: started`)

function get_db(file: string) {
	const db =
		dbs.get(file) ||
		(() => {
			const db_path = path.join(DATA_DIR, file)
			const db = new sqlite(db_path, { readonly: true, fileMustExist: true })
			dbs.set(file, db)
			DEBUG && console.log(`DB worker ${id}: opened ${file}`)
			return db
		})()
	return db
}

PRELOAD.forEach((it) => get_db(it))

parentPort!.on('message', ({ file, sql, params }: { file: string; sql: string; params?: unknown }) => {
	const db = get_db(file)
	const stmt = db.prepare(sql)
	if (params) {
		stmt.bind(params)
	}
	const rows = stmt.all()
	parentPort!.postMessage(rows)
})
