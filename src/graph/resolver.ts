import * as dict from '../dict'

/**
 * The root GraphQL resolver.
 */
export const ROOT_RESOLVER = {
	tags: dict.tags.all,

	word_count: dict.entries.word_count,
	words: dict.entries.words,

	deinflect: (args: { input: string }) => dict.inflection.deinflect(args.input),
	deinflect_all: (args: { input: string }) => dict.inflection.deinflect_all(args.input),

	entry: dict.entries.by_id,
	entries: dict.entries.by_ids,
	lookup: dict.entries.lookup,
	search: dict.entries.search,
}
