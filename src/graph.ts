import { buildSchema } from 'graphql'

import * as dict from './dict'

/**
 * The root GraphQL schema.
 */
export const SCHEMA = buildSchema(`
	type Query {
		"List of dictionary tags."
		tags(
			"""
			If provided will filter the tags by name.

			Names are not case-sensitive and support glob characters.
			"""
			names: [String!] = []
		): [Tag!]!
	}

	"Tag applicable to dictionary entries."
	type Tag {
		"Tag name."
		name: String!

		"Description for the tag."
		text: String!
	}
`)

/**
 * The root GraphQL resolver.
 */
export const ROOT = {
	tags: dict.all,
}
