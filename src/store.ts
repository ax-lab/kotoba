import fs from 'fs'
import path from 'path'

const STORE_DIR = './.store'
const RE_VALID_NAME = /^[-.\w\d_]+$/

export default class Store {
	private name: string
	private store: Record<string, unknown> = {}

	static get storage_dir() {
		return STORE_DIR
	}

	private static map = new Map<string, Store>()

	get path() {
		return path.join(STORE_DIR, `${this.name}.json`)
	}

	static named(name: string) {
		let store = this.map.get(name)
		if (!store) {
			store = new Store(name)
			this.map.set(name, store)
		}
		return store
	}

	private constructor(name: string) {
		if (!RE_VALID_NAME.test(name)) {
			throw new Error(`invalid name for store: ${name}`)
		}
		this.name = name
		try {
			const store = JSON.parse(fs.readFileSync(this.path, 'utf-8')) as unknown
			if (typeof store != 'object') {
				throw new Error(`invalid store in ${this.path}`)
			}
			this.store = store as Record<string, unknown>
		} catch (e) {
			if ((e as { code: string }).code != 'ENOENT') {
				throw e
			}
		}
	}

	get<T>(key: string, defaultValue?: T) {
		const out = this.store[key]
		if (out !== undefined) {
			return out as T
		}
		return defaultValue
	}

	/**
	 * Set multiple values in the store.
	 */
	set(arg: Record<string, unknown>): void

	/**
	 * Set a single value in the store.
	 */
	set(arg: string, value: unknown): void

	set(arg: string | Record<string, unknown>, value?: unknown) {
		let rollback: () => void

		if (typeof arg === 'string') {
			const old = this.store[arg]
			if (value === undefined) {
				delete this.store[arg]
			} else {
				this.store[arg] = value
			}
			rollback = () => {
				if (old === undefined) {
					delete this.store[arg]
				} else {
					this.store[arg] = old
				}
			}
		} else {
			const old: Record<string, unknown> = {}
			for (const key of Object.keys(arg)) {
				old[key] = this.store[key]
				this.store[key] = arg[key]
			}
			rollback = () => {
				for (const key of Object.keys(old)) {
					if (old[key] === undefined) {
						delete this.store[key]
					} else {
						this.store[key] = old[key]
					}
				}
			}
		}

		try {
			this.serialize()
		} catch (e) {
			rollback()
			throw e
		}
	}

	private dirty = false
	private pending?: () => void

	private serialize() {
		const json = JSON.stringify(this.store, null, '\t')
		const tmp = `${this.path}.tmp`
		const bck = `${this.path}.bck`
		const write = () => {
			const cleanup = () => {
				this.dirty = false
				if (this.pending) {
					const fn = this.pending
					this.pending = undefined
					fn()
				}
			}

			const header = `failed to serialize '${this.name}:'`

			// Ensure the configuration directory exists
			fs.mkdir(STORE_DIR, { recursive: true }, (err) => {
				if (err && err.code != 'EEXIST') {
					console.error(`${header} creating directory:`, err)
					return cleanup()
				}

				// Write the file to a temporary file to avoid overwriting the
				// original.
				fs.writeFile(tmp, json, (err) => {
					if (err) {
						console.error(`${header} writing temp file:`, err)
						return cleanup()
					}

					// Delete the existing backup, since we'll move the original
					// to the backup.
					fs.unlink(bck, (err) => {
						if (err && err.code != 'ENOENT') {
							console.error(`${header} removing old backup:`, err)
							return cleanup()
						}

						// Backup the old config by renaming it to the backup.
						fs.rename(this.path, bck, (err) => {
							if (err && err.code != 'ENOENT') {
								console.error(`${header} backing up old config:`, err)
								return cleanup()
							}

							// Finally rename the new config in place of the old.
							fs.rename(tmp, this.path, (err) => {
								if (err) {
									console.error(`${header} commiting new config:`, err)
								}
								cleanup()
							})
						})
					})
				})
			})
		}
		if (this.dirty) {
			this.pending = () => write()
		} else {
			this.dirty = true
			write()
		}
	}
}
