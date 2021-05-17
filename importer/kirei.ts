import { is_kana } from '../lib/kana'

import { read_lines } from './util'

/**
 * Type for a Kirei Cake entry.
 */
export type Entry = {
	expr: string
	kana: string
	sense: string[]
	tags?: string[]
}

export const TAGS = {
	name: 'Name',
	dialect: 'Dialect',
	casual: 'Casual',
	sfx: 'Sound effect',
	onomatopoeia: 'Onomatopoeia',
}

/**
 * Full mapping for the tags. A `!` prefix indicates that tag maps to another
 * tag. An empty value indicates the tag should be parsed but ignored.
 */
const TAG_MAPPINGS = {
	...TAGS,
	verb: '',
	slang: '!sl',
	SFX: '!sfx',
	idiom: '!id',
	vulgar: '!vulg',
	military: '!mil',
	polite: '!pol',
}

const PRINT_UNKNOWN_TAGS = false

/**
 * Import the entries from a Kirei Cake HTML dump file.
 */
export async function import_entries(filename: string, cur_tags: Record<string, string>) {
	// The Kirei entries are available on the HTML file sourced from the site as
	// two tables. We don't bother trying to actually parse the HTML since the
	// file format is perfectly regular and the entries are neatly arranged one
	// per line in the source file.
	const data = await read_lines(filename)

	let warnings = 0

	const warn = (msg: string) => {
		if (warnings < 30) {
			warnings++
			console.error(msg)
		}
	}

	const result: Entry[] = []

	const known_tags: Record<string, string> = { ...TAG_MAPPINGS, ...cur_tags }
	// known_tags['verb'] = ''

	// Manually fix some of the entries in the file.
	const fixes: Record<string, string[]> = {
		// ignore
		'<td class="column-1">NULL</td><td class="column-2"></td><td class="column-3"></td>': [],
		'<td class="column-1">人間とは思えない</td><td class="column-2"></td><td class="column-3">inhuman(e)</td>': [],
		'<td class="column-1">想像がつかない</td><td class="column-2"></td><td class="column-3">cannot imagine/unimaginable/nothing comes to mind</td>': [],
		'<td class="column-1">想像ができないそうぞうができない</td><td class="column-2"></td><td class="column-3">cannot imagine/unimaginable</td>': [],

		// fixes
		'<td class="column-1">|りあくしょん|リアクション /＊(KC) response/</td><td class="column-2"></td><td class="column-3"></td>': [
			'リアクション',
			'りあくしょん',
			'response',
		],
		'<td class="column-1">持ち合わせる</td><td class="column-2"></td><td class="column-3">to have or possess</td>': [
			'持ち合わせる',
			'もちあわせる',
			'to have or possess',
		],
	}

	const unknown_tags: Record<string, number> = {}

	// Entries have the format:
	//
	// `<td class="column-1">...</td><td class="column-2">...</td><td class="column-3">...</td>`
	//
	// Where `column-1` is the word with Kanji (if available), `column-2` is
	// the reading and `column-3` is the English meaning.
	const rows = data.filter((x) => x.startsWith('<td class="column-1">'))
	for (const it of rows) {
		const row = fixes[it] || it.replace(/^<td[^>]+>|<\/td>\s*$/g, '').split(/<\/td><td[^>]+>/)
		if (!row.length) {
			continue // ignored entry
		}
		if (row.length != 3) {
			warn(`row does not have 3 fields: ${it}`)
			continue
		}

		const [expr, kana, text] = row
		if (!kana && !is_kana(expr)) {
			warn(`row does not have a reading: ${it}`)
		} else if (kana && !is_kana(kana.replace(/[a-z・方]/gi, ''))) {
			warn(`invalid kana in row: ${kana}`)
		}

		const tags: string[] = []
		const sense = text
			.split(/\s*\/\s*/)
			.map((x) => {
				let txt = x.trim().replace(/^＊\(KC\)\s*/, '')

				// Parse tags at the start of a description.
				while (txt) {
					let replaced = false
					txt = txt.replace(/^\s*\(([-a-z0-9]+)\)\s*/gi, (s, tag: string) => {
						const label = known_tags[tag]
						if (label != null) {
							if (label) {
								const new_tag = label.startsWith('!') ? label.slice(1) : tag
								if (tags.indexOf(new_tag) < 0) {
									tags.push(new_tag)
								}
							}
							replaced = true
							return ''
						} else {
							unknown_tags[tag] = (unknown_tags[tag] || 0) + 1
						}
						return s
					})
					if (!replaced) {
						break
					}
				}
				return txt.trim()
			})
			.filter((x) => !!x)

		result.push({
			expr: kana ? expr : '',
			kana: kana ? kana : expr,
			tags: tags,
			sense,
		})
	}

	PRINT_UNKNOWN_TAGS &&
		console.log(
			'Undefined tags:',
			Object.keys(unknown_tags)
				.filter((x) => unknown_tags[x] > 1)
				.sort((a, b) => unknown_tags[b] - unknown_tags[a])
				.map((x) => `${x}:${unknown_tags[x]}`)
				.join(' '),
		)

	return result
}
