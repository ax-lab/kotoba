import { make_filter } from '../../lib'

import DB from './db'

/**
 * Tags applicable to dictionary entries.
 */
type Tag = {
	/**
	 * Tag name.
	 */
	name: string

	/**
	 * Description for the tag.
	 */
	text: string
}

let tags: Promise<Tag[]> | null = null

/**
 * Return a list of all tags.
 */
export async function all(args: { names: string[] }) {
	if (tags == null) {
		tags = (async () => {
			const dict = await DB.get_dict()
			const rows = (await dict.query('SELECT name, label as text FROM tags')) as Tag[]
			rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
			return rows
		})()
	}

	const filters = args.names.map((x) => make_filter(x))
	const ls = await tags
	return filters.length ? ls.filter((x) => filters.some((re) => re.test(x.name))) : [...ls]
}
