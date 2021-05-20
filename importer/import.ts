import fs from 'fs'
import path from 'path'

import sqlite from 'sqlite3'

import * as lib from '../lib'
import { kana } from '../lib'

import { file_exists } from './files'
import * as jmdict from './jmdict'
import * as kanjidic from './kanjidic'
import * as kirei from './kirei'

const DICT_DATABASE = 'dict.db'
const KANJI_DATABASE = 'kanji.db'

const DICT_FILE = 'jmdict_english.zip'
const KANJIDIC_FILE = 'kanjidic2.zip'
const KIREI_CAKE = 'kirei-cake.html.txt'

const DATA_SRC_DIR = path.join(__dirname, '..', 'data', 'source')
const DATA_OUT_DIR = path.join(__dirname, '..', 'data')

const check_data = () => {
	const stat = fs.statSync(DATA_SRC_DIR)
	if (!stat || !stat.isDirectory()) {
		console.error('Fatal error: data source directory not found')
		return false
	}
	return true
}

async function main() {
	if (!check_data()) {
		return
	}
	console.log(`- Data source directory is ${DATA_SRC_DIR}`)
	console.log(`- Data output directory is ${DATA_OUT_DIR}`)

	const db_kanji = path.join(DATA_OUT_DIR, KANJI_DATABASE)
	console.log('\n#====================== Generating kanji.db ======================#\n')
	await generate_kanji(db_kanji)

	const db_dict = path.join(DATA_OUT_DIR, DICT_DATABASE)
	if (!(await file_exists(db_dict))) {
		console.log('\n#====================== Generating dict.db ======================#\n')
		await generate_dict(db_dict)
	} else {
		console.log(`\n- File ${db_dict} already exists, skipping.`)
	}
}

async function generate_kanji(db_file: string) {
	await kanjidic.import_entries(path.join(DATA_SRC_DIR, KANJIDIC_FILE))
}

async function generate_dict(db_file: string) {
	// Import main entries from JMDict.
	const jm_data = await jmdict.import_entries(path.join(DATA_SRC_DIR, DICT_FILE))

	const entries = jm_data.entries

	// Import additional entries from Kirei Cake.
	const kirei_cake = path.join(DATA_SRC_DIR, KIREI_CAKE)
	const kirei_entries = await kirei.import_entries(kirei_cake, jm_data.tags)
	console.log(`\n>>> Imported ${kirei_entries.length} Kirei Cake entries`)

	const TAG_KIREI = 'kirei'
	const tags: Record<string, string> = { ...kirei.TAGS, ...jm_data.tags, [TAG_KIREI]: 'From Kirei Cake' }

	// Map existing entries from the JMDict data so we can merge with Kirei Cake
	const entries_index: Record<string, number> = {}
	entries.forEach((it, index) => {
		// Map each kanji variation with its readings
		for (const k of it.kanji) {
			for (const r of it.reading) {
				if (r.restrict.length) {
					continue // restricted readings are mapped below
				}
				entries_index[`${k.expr}||${r.expr}`] = index
			}
		}
		// Map restricted readings and entries without a kanji element.
		for (const r of it.reading) {
			for (const expr of r.restrict) {
				entries_index[`${expr}||${r.expr}`] = index
			}
			if (!it.kanji.length) {
				entries_index[`${r.expr}`] = index
			}
		}
	})

	// Merge the Kirei Cake entries to the JSDict format.
	const kirei_sequence = 5000000
	let new_entries = 0
	let cur_entries = 0
	for (const [pos, it] of kirei_entries.entries()) {
		const entry = [it.expr, it.kana].filter((x) => !!x)
		const index = entries_index[`${entry.join('||')}`]
		if (index == null) {
			// Append a new entry directly
			new_entries++
			entries.push({
				sequence: (kirei_sequence + pos).toString(),
				kanji: !it.expr
					? []
					: [
							{
								expr: it.expr,
								info: it.tags || [],
								priority: [],
							},
					  ],
				reading: [
					{
						expr: it.kana,
						info: it.expr ? [] : it.tags || [],
						priority: [],
						restrict: [],
					},
				],
				sense: [
					{
						misc: [TAG_KIREI],
						glossary: it.sense.map((x) => ({ text: x })),
					},
				],
			})
		} else {
			// For an existing entry, add a sense.
			cur_entries++
			entries[index].sense.push({
				misc: [TAG_KIREI],
				glossary: it.sense.map((x) => ({ text: x })),
			})
		}
	}
	console.log(`Merged ${new_entries} new and ${cur_entries} existing entries from Kirei Cake`)

	const entries_index_rows: Array<{ kanji: string; reading: string; sequence: string }> = []
	entries.forEach((it) => {
		const sequence = it.sequence

		// Map each kanji variation with its readings
		for (const k of it.kanji) {
			for (const r of it.reading) {
				if (r.restrict.length) {
					continue // restricted readings are mapped below
				}
				entries_index_rows.push({ sequence, kanji: k.expr, reading: r.expr })
			}
		}
		// Map restricted readings and entries without a kanji element.
		for (const r of it.reading) {
			for (const expr of r.restrict) {
				entries_index_rows.push({ sequence, kanji: expr, reading: r.expr })
			}
			if (!it.kanji.length) {
				entries_index_rows.push({ sequence, kanji: '', reading: r.expr })
			}
		}
	})

	const tb_entries_index = entries_index_rows.map((x) => ({ ...x, hiragana: kana.to_hiragana(x.reading) }))

	console.log(`\n>>> Building index map from entries...`)
	const map_entries = entries.flatMap((entry) => {
		const sequence = entry.sequence
		const words: Record<string, boolean> = {}
		for (const row of entry.kanji) {
			words[row.expr] = true
		}
		for (const row of entry.reading) {
			words[row.expr] = true
		}
		return Object.keys(words).map((expr) => ({ sequence, expr }))
	})

	console.log(`... Collected ${map_entries.length} map entries. Indexing...`)

	const start_index = lib.now()
	const tb_entries_map = map_entries.map((it, i) => {
		const num = i + 1
		const keyword = kana.to_hiragana_key(it.expr)

		const chars = [...keyword]
		const keyword_rev = chars.reverse().join('')

		const keyword_set = [...new Set(chars)].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('')

		const final = num == map_entries.length
		if (num % 25000 == 0 || final) {
			const delta = lib.now() - start_index
			const rate = (num / (delta / 1000)).toFixed(0)
			const time = lib.duration(delta / num)
			console.log(`${final ? '---' : '...'} ${num} rows processed (${rate} per sec / ${time} per row)`)
		}
		return { ...it, keyword, keyword_rev, keyword_set }
	})

	try {
		fs.unlinkSync(db_file)
	} catch (e) {
		// ignore
	}

	console.log(`Writing database to ${db_file}\n`)

	const sep = jmdict.LIST_SEPARATOR

	// TODO: index kanji/reading unique pairs to their own table

	const start_db = lib.now()
	const db = new DB(db_file)
	await db.exec('PRAGMA journal_mode = MEMORY')
	await db.exec(`
		CREATE TABLE tags (
			name  TEXT PRIMARY KEY,
			label TEXT
		);

		CREATE TABLE entries (sequence TEXT PRIMARY KEY);

		CREATE TABLE entries_index(
			kanji          TEXT,
			reading        TEXT,
			hiragana       TEXT,
			sequence       TEXT,
			PRIMARY KEY (kanji, reading, sequence)
		);

		CREATE TABLE entries_kanji (
			sequence       TEXT,
			pos            INT,
			expr           TEXT,
			info           TEXT,
			priority       TEXT,
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_reading (
			sequence       TEXT,
			pos            INT,
			expr           TEXT,
			no_kanji       INTEGER,
			info           TEXT,
			priority       TEXT,
			restrict       TEXT,
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_sense (
			sequence        TEXT,
			pos             INT,
			stag_kanji      TEXT,
			stag_reading    TEXT,
			part_of_speech  TEXT,
			dialect         TEXT,
			xref            TEXT,
			antonym         TEXT,
			field           TEXT,
			misc            TEXT,
			info            TEXT,
			PRIMARY KEY (sequence, pos)
		);

		CREATE TABLE entries_sense_source (
			sequence        TEXT,
			pos             INT,
			elem            INT,
			text            TEXT,
			lang            TEXT,
			partial         INT,
			wasei           INT,
			PRIMARY KEY (sequence, pos, elem)
		);

		CREATE TABLE entries_sense_glossary (
			sequence        TEXT,
			pos             INT,
			elem            INT,
			text            TEXT,
			type            TEXT,
			PRIMARY KEY (sequence, pos, elem)
		);

		CREATE TABLE entries_map(
			sequence        TEXT,  -- sequence in the 'entries' table
			expr            TEXT,  -- indexed expression from the source

			keyword         TEXT,  -- 'expr' stripped to a indexable key
			keyword_rev     TEXT,  -- 'keyword' reversed for suffix lookup
			keyword_set     TEXT   -- char set in 'keyword' sorted by codepoint
		);
	`)

	const tb_entries = entries.map((x) => ({ sequence: x.sequence }))

	const tb_tags = Object.keys(tags)
		.sort()
		.map((name) => ({ name, label: tags[name] }))

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

	const join = (ls: string[] | undefined) => (ls ? ls.join(sep) : '')

	const tb_sense = entries.flatMap((x) => {
		return x.sense.map((row, pos) => ({
			sequence: x.sequence,
			pos: pos,
			stag_kanji: join(row.stag_kanji),
			stag_reading: join(row.stag_reading),
			part_of_speech: join(row.pos),
			dialect: join(row.dialect),
			xref: join(row.xref),
			antonym: join(row.antonym),
			field: join(row.field),
			misc: join(row.misc),
			info: join(row.info),
		}))
	})

	const tb_sense_source = entries.flatMap((x) => {
		return x.sense.flatMap((row, pos) =>
			!row.source
				? []
				: row.source.map((it, elem) => ({
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

	await db.insert('tags', tb_tags)
	await db.insert('entries', tb_entries)
	await db.insert('entries_index', tb_entries_index)
	await db.insert('entries_kanji', tb_kanji)
	await db.insert('entries_reading', tb_readings)
	await db.insert('entries_sense', tb_sense)
	await db.insert('entries_sense_source', tb_sense_source)
	await db.insert('entries_sense_glossary', tb_sense_glossary)
	await db.insert('entries_map', tb_entries_map)

	console.log('\n>>> Building database indexes...')
	const start_db_index = lib.now()

	// Note that even if our index keywords are case-insensitive we still need
	// the `COLLATE NOCASE` to make sure SQLite uses the index with the LIKE
	// operator (which is case-insensitive by default).
	//
	// The other option would be for clients to use the following:
	//
	//     PRAGMA case_sensitive_like = 1
	//
	// But that would require clients to be aware of that.
	await db.exec(`CREATE INDEX idx_entries_map_expr ON entries_map (expr COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword ON entries_map (keyword COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword_rev ON entries_map (keyword_rev COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_map_keyword_set ON entries_map (keyword_set COLLATE NOCASE)`)
	await db.exec(`CREATE INDEX idx_entries_index_kanji ON entries_index (kanji)`)
	await db.exec(`CREATE INDEX idx_entries_index_reading ON entries_index (reading)`)
	await db.exec(`CREATE INDEX idx_entries_index_hiragana ON entries_index (hiragana)`)
	console.log(`--- Indexes created in ${lib.elapsed(start_db_index)}`)

	await db.close()

	const delta = lib.now() - start_db
	const per_entry = delta / entries.length
	const per_delta = entries.length / (delta / 1000)
	console.log(
		`\nGenerated database in ${lib.duration(delta)} ` +
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
