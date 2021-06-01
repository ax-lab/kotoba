import * as path from 'path'

import sqlite from 'sqlite3'

const DATA_DIR = path.join('.', 'data')

export default class DB {
	// #region Instance management

	static get_dict() {
		return DB.get('dict.db')
	}

	private static _map = new Map<string, Promise<DB>>()

	private _db: sqlite.Database
	private _name: string

	private constructor(name: string, db: sqlite.Database) {
		this._db = db
		this._name = name
	}

	/**
	 * Returns a shared database instance for the given file, opening it if
	 * necessary.
	 */
	static async get(name: string) {
		const open_db = DB._map.get(name)
		if (open_db) {
			return await open_db
		}

		const new_db = new Promise<DB>((resolve, reject) => {
			const db_path = path.join(DATA_DIR, name)
			const db = new sqlite.Database(db_path, sqlite.OPEN_READONLY, (err) => {
				if (err) {
					reject(err)
				}
				resolve(new DB(name, db))
			})
		})

		DB._map.set(name, new_db)
		return new_db
	}

	private _closed = false

	private check_closed() {
		if (this._closed) {
			throw new Error('database is closed')
		}
	}

	async close() {
		if (this._closed) {
			return
		}
		this._closed = true
		DB._map.delete(this._name)
		await new Promise<void>((resolve, reject) => this._db.close((err) => (err ? reject(err) : resolve())))
	}

	// #endregion

	each<T = Record<string, string>>(
		sql: string,
		params: unknown,
		row_callback: (err: Error | null, row: T) => void,
		end_callback?: (err: Error | null, count: number) => void,
	) {
		this.check_closed()
		this._db.each(sql, params, row_callback, end_callback)
	}

	async query<T = Record<string, string>>(sql: string, params?: unknown) {
		this.check_closed()
		return new Promise<T[]>((resolve, reject) => {
			this._db.all(sql, params || [], (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve((rows as unknown) as T[])
				}
			})
		})
	}
}
