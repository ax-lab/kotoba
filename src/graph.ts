import { buildSchema } from 'graphql'

/**
 * The root GraphQL schema.
 */
export const SCHEMA = buildSchema(`
	type Query {
		hello: String!
	}
`)

export const ROOT = {
	hello() {
		return 'hello world!'
	},
}
