import { buildSchema, graphql } from 'graphql'

import { ROOT_RESOLVER } from './resolver'
import { SCHEMA_TEXT } from './schema'

/**
 * The root GraphQL schema.
 */
export const SCHEMA = buildSchema(SCHEMA_TEXT)

export const ROOT = ROOT_RESOLVER

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
