import sqlite from 'sqlite3'
import { v4 as uuid } from 'uuid'

import { get_store_dir } from './config'

export default class SQLite {
	private _db: sqlite.Database

	static async open(name: string) {
		const filename = `${get_store_dir()}/${name}`

		const db = await new Promise<sqlite.Database>((resolve, reject) => {
			const db = new sqlite.Database(filename, (err) => {
				if (err) {
					reject(err)
				}
				resolve(db)
			})
		})
		return new SQLite(db)
	}

	new_id() {
		return uuid()
	}

	private constructor(db: sqlite.Database) {
		this._db = db
	}

	async close() {
		return new Promise<void>((resolve, reject) => {
			this._db.close((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async query<T>(sql: string, args?: unknown) {
		const stmt = await this.prepare_stmt(sql)
		const out = await new Promise<T[]>((resolve, reject) => {
			stmt.all(args, (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve(rows as T[])
				}
			})
		})
		await this.finalize_stmt(stmt)
		return out
	}

	async exec(sql: string) {
		return new Promise<void>((resolve, reject) => {
			this._db.exec(sql, (err) => {
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	}

	async finalize_stmt(cmd: sqlite.Statement) {
		return new Promise<void>((resolve, reject) => {
			cmd.finalize((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async prepare_stmt(sql: string) {
		return new Promise<sqlite.Statement>((resolve, reject) => {
			this._db.prepare(sql, function (err) {
				if (err) {
					reject(err)
				}
				resolve(this)
			})
		})
	}
}
