/**
 * Lookup modes for entry matching.
 */
export type EntryMatchMode =
	| 'exact'
	| 'deinflect'
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

/**
 * Additional information about the matched entry.
 */
export type EntryMatch = {
	/**
	 * Lookup mode that matched this entry.
	 */
	mode: EntryMatchMode

	/**
	 * Portion of the search query that matched.
	 */
	query: string

	/**
	 * Expression (kanji or reading) that was matched.
	 */
	text: string

	/**
	 * Possibly non-continuous sequence of characters from `text` that
	 * matched the entry.
	 */
	segments: string

	/**
	 * For de-inflected entries this is the inflected suffix from the
	 * original query.
	 */
	inflected_suffix?: string

	/**
	 * Inflection rules that were applied to match this entry.
	 */
	inflection_rules?: string[]
}
