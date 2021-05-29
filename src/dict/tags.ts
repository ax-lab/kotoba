import { make_filter } from '../../lib'

import DB from './db'

/**
 * Tags applicable to dictionary entries.
 */
export type Tag = {
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
export async function all(args?: { names: string[] }) {
	if (tags == null) {
		tags = (async () => {
			const dict = await DB.get_dict()
			const rows = await dict.query<Tag>('SELECT name, label as text FROM tags')
			rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
			return rows
		})()
	}

	const filters = args?.names.map((x) => make_filter(x))
	const ls = await tags
	return filters?.length ? ls.filter((x) => filters.some((re) => re.test(x.name))) : [...ls]
}

export function is_popular(tags: Tag[]) {
	return tags.some((x) => /^(news1|ichi1|spec1|spec2|gai1)$/.test(x.name))
}

export function split(input: string, all_tags: Tag[]) {
	return input
		? (input
				.split('||')
				.map((name) => all_tags.find((x) => x.name == name))
				.filter((x) => !!x) as Tag[])
		: []
}
