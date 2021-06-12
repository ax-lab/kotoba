/**
 * Search dictionary entries using the GraphQL endpoint.
 */
export async function search(text: string, args?: { id?: string; offset?: number; limit?: number }) {
	if (!text.trim()) {
		const empty: Search = {
			id: args?.id || '',
			total: 0,
			elapsed: 0,
			loading: false,
			page: {
				offset: 0,
				limit: 0,
				entries: [],
			},
		}
		return empty
	}

	const offset = args?.offset || 0
	const limit = args?.limit || 25

	const vars = { id: args?.id, text, offset, limit }
	const out = await query<{ search: Search }>(
		`
		query($id: String, $text: String!, $offset: Int!, $limit: Int!) {
			search(id: $id, query: $text) {
				id total elapsed loading
				page(offset: $offset, limit: $limit) {
					offset limit
					entries {
						id
						match_mode
						word read text
					}
				}
			}
		}`,
		vars,
	)
	return out.search
}

export type Search = {
	id: string
	total: number
	elapsed: number
	loading: boolean
	page: SearchPage
}

export type SearchPage = {
	offset: number
	limit: number
	entries: SearchEntry[]
}

export type SearchEntry = {
	id: string
	match_mode:
		| 'exact'
		| 'prefix'
		| 'suffix'
		| 'contains'
		| 'approx'
		| 'approx-prefix'
		| 'approx-suffix'
		| 'approx-contains'
		| 'fuzzy'
		| 'fuzzy-prefix'
		| 'fuzzy-suffix'
		| 'fuzzy-contains'
	word: string
	read: string
	text: string
}

/**
 * Executes a raw GraphQL query.
 */
export async function query<T>(text: string, vars?: Record<string, unknown>) {
	const q = {
		query: indent(text),
		variables: vars || null,
	}
	return fetch('/graphql', {
		method: 'POST',
		body: JSON.stringify(q),
		headers: {
			'Content-Type': 'application/json',
		},
	})
		.then((result) => result.json())
		.then(({ data, errors }) => {
			if (errors) {
				const message = (errors as Array<{ message: string }>).map((x) => x.message).join(' / ')
				console.error('GraphQL:', message)
				console.info('Query:', q)
				console.info('Error:', errors)
				throw new Error(message)
			}
			return data as T
		})
}

function indent(text: string) {
	const lines = text.split(/\r\n?|\n/)
	while (lines.length && !lines[0].trim()) {
		lines.shift()
	}
	while (lines.length && !lines[lines.length - 1].trim()) {
		lines.pop()
	}
	const prefix = lines.length ? lines[0].slice(0, Math.max(lines[0].search(/[^\s]/), 0)) : ''
	return lines.map((x) => (x.startsWith(prefix) ? x.slice(prefix.length) : x).trimEnd()).join('\n')
}
