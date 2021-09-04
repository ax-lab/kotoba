import { buildSchema, graphql } from 'graphql'

import * as dict from '../dict'

import { SCHEMA_TEXT } from './schema'

/**
 * The root GraphQL schema.
 */
export const SCHEMA = buildSchema(SCHEMA_TEXT)

/**
 * The root GraphQL resolver.
 */
export const ROOT = {
	tags: dict.tags.all,

	word_count: dict.entries.word_count,
	words: dict.entries.words,

	entry: dict.entries.by_id,
	entries: dict.entries.by_ids,
	lookup: dict.entries.lookup,
	search: dict.entries.search,
	list: dict.entries.list,
}

/**
 * Executes a GraphQL query directly.
 */
export async function query(query: string, args?: { variables?: Record<string, unknown>; operation?: string }) {
	const result = await graphql({
		schema: SCHEMA,
		rootValue: ROOT,
		source: query,
		variableValues: args?.variables,
		operationName: args?.operation,
	})
	return result
}
