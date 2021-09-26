import SQLite from '../sqlite'

export type Phrase = {
	id: string
	text: string
	date: string
}

export async function list_phrases() {
	const db = await get_db()
	const out = await db.query<Phrase>(`SELECT * FROM phrases`)
	await db.close()
	return out
}

export async function add_phrase(text: string) {
	text = text.trim()

	const db = await get_db()
	const date = new Date().toISOString()
	await db.query(
		`
		INSERT INTO phrases (id, text, date)
		SELECT ?, ?, ?
		WHERE NOT EXISTS (SELECT * FROM phrases WHERE text = ?)
	`,
		[db.new_id(), text, date, text],
	)

	const [{ id }] = await db.query<Phrase>(`SELECT * FROM phrases WHERE text = ?`, [text])

	await db.close()
	return id || ''
}

export async function remove_phrase(id: string) {
	const db = await get_db()
	await db.query(`DELETE FROM phrases WHERE id = ?`, [id])
	await db.close()
}

async function get_db() {
	const db = await SQLite.open('phrases.db')
	await db.exec(`
		CREATE TABLE IF NOT EXISTS phrases (
			id   TEXT PRIMARY KEY,
			text TEXT,
			date TEXT,
			UNIQUE(text)
		);
	`)
	return db
}
