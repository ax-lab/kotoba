import * as dict from '../dict'
import * as history from '../dict/history'
import { server_events } from '../event_dispatcher'

import * as phrases from './phrases'

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

	remote_input: (args: { input: string; sequence: number }) => {
		server_events.post({
			type: 'remote-input',
			input: args.input,
			sequence: args.sequence,
		})
		return true
	},

	async phrases() {
		return await phrases.list_phrases()
	},

	async add_phrase({ text }: { text: string }) {
		const out = await phrases.add_phrase(text)
		server_events.post({ type: 'history-change' })
		return out
	},

	async remove_phrase({ id }: { id: string }) {
		await phrases.remove_phrase(id)
		server_events.post({ type: 'history-change' })
		return true
	},

	async insert_history({ id }: { id: string }) {
		await history.add_word(id)
		return true
	},

	async remove_history({ id }: { id: string }) {
		await history.remove_word(id)
		return true
	},
}
