/**
 * Utility methods for tests.
 *
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, test } from '@jest/globals'

export { describe, expect, test }

/**
 * Alias for `expect` just to be used with `extendExpect` without causing name
 * shadowing errors.
 */
export const baseExpect = expect

/**
 * Simplified interface for the `expect` function.
 */
interface ExpectFn<T> {
	(...args: any): T

	readonly extend: (member: unknown) => any
}

/**
 * Takes a callable type and returns the exact same type minus the first
 * argument.
 *
 * We need this because the type we pass to `expect.extend` has one
 * additional receiver parameter that is not on the final interface.
 */
type RestParameters<T extends (x: any, ...args: any) => any> = T extends (x: any, ...args: infer P) => infer Q
	? (...args: P) => Q
	: never

type HideReturn<T extends (...args: any) => any> = T extends (...args: infer P) => any ? (...args: P) => void : T

/**
 * Maps the source type to a type with all callable fields mapped with
 * `RestParameters<T>`. Non-callable fields are kept intact.
 */
type ToExpectMatcherInterface<T> = {
	readonly [KeyType in keyof T]: T[KeyType] extends (x: any, ...args: any) => any
		? HideReturn<RestParameters<T[KeyType]>>
		: T[KeyType]
}

/**
 * Calls `expect.extend` on Jest's `expect` function to extend it.
 *
 * @returns the `expect` function with the extended type.
 *
 * NOTE: the whole purpose of this utility method is to provide an easy way
 * to extend test matchers while still retaining strong-typing support.
 */
export function extendExpect<Fn extends ExpectFn<U>, T, U>(expect: Fn, matchers: T) {
	// This is the only actual code that we run. Everything else is just
	// compile-time type-system black magic.
	expect.extend(matchers)

	// Derive the public custom `Matchers` interface from the `members` argument.
	type CustomMatchers = ToExpectMatcherInterface<T>

	// Build the extended `Matchers`. This is what is returned by `expect`.
	//
	// Merges the base `Matchers` given by `ReturnType<typeof expect>` to our
	// own `CustomMatchers`.
	type ExtendedMatchers = ReturnType<Fn> &
		CustomMatchers & {
			// We need to map `not` as well, otherwise we'll lose the custom
			// matchers on it.
			readonly not: ReturnType<Fn> & CustomMatchers
		}

	return (expect as unknown) as ExpectFn<ExtendedMatchers>
}
