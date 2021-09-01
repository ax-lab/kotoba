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

export function split(input: string, all_tags: Tag[]) {
	return input
		? input.split(/,|\|\|/).map((name) => all_tags.find((x) => x.name == name) || { name, text: get_text(name) })
		: []
}

/**
 * Return text for dynamic tags that are not on the database (e.g. priority tags).
 */
function get_text(name: string) {
	switch (name) {
		case 'news1':
			return 'top half 12K entries from Mainichi Shimbun newspaper word corpus'
		case 'news2':
			return 'bottom half 12K entries from Mainichi Shimbun newspaper word corpus'
		case 'ichi1':
			return 'appears in the "Ichimango goi bunruishuu" word corpus'
		case 'ichi2':
			return 'appears in the "Ichimango goi bunruishuu" word corpus, but demoted due to low frequency on other sources'
		case 'spec1':
			return 'top half of common words that do not appear on the word corpus'
		case 'spec2':
			return 'bottom half of common words that do not appear on the word corpus'
		case 'gail1':
			return 'top half of common loanwords in the word corpus'
		case 'gail2':
			return 'bottom half of common loanwords in the word corpus'
	}
	if (name.startsWith('nf')) {
		const page = parseInt(name.slice(2), 10)
		const top = page > 1 ? `${page * 0.5}K` : `${page * 500}`
		return `top ${top} in the word corpus`
	}
	return ''
}
