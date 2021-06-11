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
