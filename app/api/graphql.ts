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

export const ENTRY_FRAGMENTS = `
	fragment TagF on Tag {
		name text
	}

	fragment EntryF on Entry {
		id
		match {
			mode
			query
			text
			segments
			inflected_suffix
			inflection_rules
		}
		word
		read
		text
		rank
		frequency
		position
		jlpt
		popular
		kanji   { ...EntryKanjiF }
		reading { ...EntryReadingF }
		sense   { ...EntrySenseF }
	}

	fragment EntryKanjiF on EntryKanji {
		expr
		popular
		info     { ...TagF }
		priority { ...TagF }
	}

	fragment EntryReadingF on EntryReading {
		expr
		no_kanji
		restrict
		popular
		info     { ...TagF }
		priority { ...TagF }
		pitches  { ...EntryPitchF }
	}

	fragment EntrySenseF on EntrySense {
		stag_kanji
		stag_reading
		xref
		antonym
		info
		pos      { ...TagF }
		field    { ...TagF }
		misc     { ...TagF }
		dialect  { ...TagF }
		source   { ...EntrySenseSourceF }
		glossary { ...EntrySenseGlossaryF }
	}

	fragment EntryPitchF on EntryPitch {
		value
		tags { ...TagF }
	}

	fragment EntrySenseSourceF on EntrySenseSource {
		text
		lang
		partial
		wasei
	}

	fragment EntrySenseGlossaryF on EntrySenseGlossary {
		text
		type
	}
`
