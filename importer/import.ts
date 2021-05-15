import fs from 'fs'
import path from 'path'

import sqlite from 'sqlite3'

import * as lib from '../lib'

import * as jmdict from './jmdict'

const DICT_DATABASE = 'dict.db'

const DICT_FILE = 'jmdict_english.zip'

const DATA_DIR = path.join(__dirname, '..', 'data')

const check_data = () => {
	const stat = fs.statSync(DATA_DIR)
	if (!stat || !stat.isDirectory()) {
		console.error('Fatal error: data directory not found')
		return false
	}
	return true
}

async function main() {
	if (!check_data()) {
		return
	}
	console.log(`Data directory is ${DATA_DIR}`)

	const db_file = path.join(DATA_DIR, DICT_DATABASE)
	const entries = await jmdict.import_entries(path.join(DATA_DIR, DICT_FILE))
	try {
		fs.unlinkSync(db_file)
	} catch (e) {
		// ignore
	}

	console.log(`Writing database to ${db_file}\n`)

	const sep = jmdict.LIST_SEPARATOR

	const start_db = lib.now()
	const db = new DB(db_file)
	await db.exec('PRAGMA journal_mode = MEMORY')
	await db.exec(`
		CREATE TABLE entries (sequence TEXT PRIMARY KEY);
		CREATE TABLE tags (name TEXT PRIMARY KEY, label TEXT);
		CREATE TABLE entries_kanji (
			sequence TEXT, pos INT,
			expr TEXT, info TEXT, priority TEXT,
			PRIMARY KEY (sequence, pos)
		);
		CREATE TABLE entries_reading (
			sequence TEXT, pos INT,
			expr TEXT, no_kanji INTEGER, info TEXT, priority TEXT, restrict TEXT,
			PRIMARY KEY (sequence, pos)
		);
		CREATE TABLE entries_sense (
			sequence TEXT, pos INT,
			stag_kanji TEXT, stag_reading TEXT, part_of_speech TEXT, dialect TEXT,
			xref TEXT, antonym TEXT, field TEXT, misc TEXT, info TEXT,
			PRIMARY KEY (sequence, pos)
		);
		CREATE TABLE entries_sense_source (
			sequence TEXT, pos INT, elem INT,
			text TEXT, lang TEXT, partial INT, wasei INT,
			PRIMARY KEY (sequence, pos, elem)
		);
		CREATE TABLE entries_sense_glossary (
			sequence TEXT, pos INT, elem INT,
			text TEXT, type TEXT,
			PRIMARY KEY (sequence, pos, elem)
		);
	`)

	const tb_entries = entries.map((x) => ({ sequence: x.sequence }))

	const tb_kanji = entries.flatMap((x) => {
		return x.kanji.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			expr: row.expr,
			info: row.info.join(sep),
			priority: row.priority.join(sep),
		}))
	})

	const tb_readings = entries.flatMap((x) => {
		return x.reading.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			expr: row.expr,
			no_kanji: row.no_kanji ? 1 : 0,
			info: row.info.join(sep),
			priority: row.priority.join(sep),
			restrict: row.restrict.join(sep),
		}))
	})

	const tb_sense = entries.flatMap((x) => {
		return x.sense.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			stag_kanji: row.stag_kanji.join(sep),
			stag_reading: row.stag_reading.join(sep),
			part_of_speech: row.pos.join(sep),
			dialect: row.dialect.join(sep),
			xref: row.xref.join(sep),
			antonym: row.antonym.join(sep),
			field: row.field.join(sep),
			misc: row.misc.join(sep),
			info: row.info.join(sep),
		}))
	})

	const tb_sense_source = entries.flatMap((x) => {
		return x.sense.flatMap((row, pos) =>
			row.source.map((it, elem) => ({
				sequence: x.sequence,
				pos: pos,
				elem: elem,
				text: it.text,
				lang: it.lang,
				partial: it.partial,
				wasei: it.wasei,
			})),
		)
	})

	const tb_sense_glossary = entries.flatMap((x) => {
		return x.sense.flatMap((row, pos) =>
			row.glossary.map((it, elem) => ({
				sequence: x.sequence,
				pos: pos,
				elem: elem,
				text: it.text,
				type: it.type,
			})),
		)
	})

	await db.insert('entries', tb_entries)
	await db.insert('entries_kanji', tb_kanji)
	await db.insert('entries_reading', tb_readings)
	await db.insert('entries_sense', tb_sense)
	await db.insert('entries_sense_source', tb_sense_source)
	await db.insert('entries_sense_glossary', tb_sense_glossary)

	await db.close()

	const delta = lib.now() - start_db
	const per_entry = delta / entries.length
	const per_delta = entries.length / (delta / 1000)
	console.log(
		`Generated database in ${lib.duration(delta)} ` +
			`(${lib.duration(per_entry)} per row / ${per_delta.toFixed(1)} per sec)...`,
	)
}

main().catch((err) => {
	console.error(err)
})

class DB {
	private db: sqlite.Database

	constructor(filename: string) {
		this.db = new sqlite.Database(filename)
	}

	async close() {
		return new Promise<void>((resolve, reject) => {
			this.db.close((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async insert(table: string, rows: Array<Record<string, unknown>>) {
		if (!rows.length) {
			return
		}

		const cols = Object.keys(rows[0])
		console.log(`>>> INSERTING ${rows.length} rows into ${table}...`)

		const start = lib.now()

		await this.exec('BEGIN EXCLUSIVE')

		const SQL = ['INSERT INTO ', table, ' (', cols.join(', '), ') VALUES (', cols.map(() => '?').join(', '), ')']
		const stmt = await this.prepare(SQL.join(''))
		for (let i = 0; i < rows.length; i++) {
			const pos = i + 1
			const row = rows[i]
			const args = []
			for (const key of cols) {
				args.push(row[key])
			}
			await this.run(stmt, args)
			if (pos % 10000 == 0) {
				const total = pos
				const delta = lib.now() - start
				const rate = (total / (delta / 1000)).toFixed(0)
				const time = lib.duration(delta / total)
				console.log(`    ${pos} (${rate} per sec / ${time} per row)...`)
			}
		}

		await this.exec('END')
		await this.finalize(stmt)

		const total = rows.length
		const delta = lib.now() - start
		const rate = (total / (delta / 1000)).toFixed(0)
		const time = lib.duration(delta / total)
		console.log(`=== Inserted in ${lib.duration(delta)} (${rate} per sec / ${time} per row)\n`)
	}

	async run(cmd: sqlite.Statement, args: unknown[]) {
		return new Promise<void>((resolve, reject) => {
			cmd.run(args, (err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async finalize(cmd: sqlite.Statement) {
		return new Promise<void>((resolve, reject) => {
			cmd.finalize((err) => {
				if (err) {
					reject(err)
				}
				resolve()
			})
		})
	}

	async prepare(sql: string) {
		return new Promise<sqlite.Statement>((resolve, reject) => {
			this.db.prepare(sql, function (err) {
				if (err) {
					reject(err)
				}
				resolve(this)
			})
		})
	}

	async exec(sql: string) {
		return new Promise<void>((resolve, reject) => {
			this.db.exec(sql, (err) => {
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	}
}
