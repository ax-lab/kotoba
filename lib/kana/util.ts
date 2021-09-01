import { List, Map, Seq } from 'immutable'

/**
 * Constructor for a tuple. Used for type inference.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tuple<T extends any[]>(...args: T): T {
	return args
}

/**
 * Returns an instance of a TextBuilder that allows for mutable fast
 * concatenation of text.
 */
export function TextBuilder() {
	const buffer: unknown[] = []
	return {
		/** Append to the TextBuilder's buffer. */
		push(...args: unknown[]) {
			for (const it of args) {
				if (it != null) {
					buffer.push(it)
				}
			}
		},

		/** Returns the concatenated string. */
		toString() {
			return buffer.join('')
		},
	}
}

type SomeEnum = {
	[key: string]: number | string
	[key: number]: number | string
}

/**
 * Returns the string representation of an enumeration value. This relies on
 * the way TypeScript generates the enum code.
 *
 * Supports string enums, numeric enums, and bit flags (`isFlag` must be true).
 *
 * This handles `null`, `undefined`, empty, and invalid values.
 *
 * @param enumType
 * The enumeration type itself.
 *
 * @param value
 * The enumeration value to print.
 *
 * @param isFlag
 * If true, the function will handle numeric enums as bitflags.
 *
 * @returns A string representation of the enumeration value, suited for
 * debugging.
 */
export function enumToString(enumType: SomeEnum, value: number | string | null | undefined, isFlag = false): string {
	// Trivial cases:
	if (value === undefined) {
		return '(undefined)'
	}
	if (value === null) {
		return '(null)'
	}
	if (value === '') {
		return '(empty)'
	}

	// Handles a simple value for a numeric enum:
	const valueName = enumType[value]
	if (typeof valueName === 'string') {
		return valueName
	}

	// Handles a direct string value (e.g. string enum or invalid enum flag):
	if (typeof value === 'string') {
		return value
	}

	// For bitflags we need to isolate the individual bits
	if (isFlag) {
		// Filter the numeric enum keys, which correspond to the flags (enums
		// generate a reverse mapping of value to names as well).
		const enumValues = Seq(enumType)
			.filter((v) => typeof v === 'number')
			.toMap() as Map<string, number>

		// Sort the keys. We want individual bit flags to be sorted by
		// increasing value, but we want composites to come first and be
		// sorted decreasing (from broadest to narrowest).
		//
		// This weird sort order makes sure that when a composite flag is used
		// it will actually appear in the output, with more complete flags being
		// considered first.

		// Check if `key` is a composite flag. This is true if any other
		// flag bits are a subset of `key`.
		const isComposite = (key: string) => {
			const val = enumValues.get(key)!
			for (const v of enumValues.values()) {
				// `v` is a subset of `val` if:
				// - it is not the empty flag;
				// - any bit set in `v` is also set in `val`;
				// - and `v` is not equal to `val`.
				if (v !== 0 && (v & val) === v && v < val) {
					return true
				}
			}
			return false
		}

		const keys = enumValues.keySeq().sort((a, b) => {
			const cA = isComposite(a)
			const cB = isComposite(b)
			if (cA !== cB) {
				// Composite keys come first
				return cA ? -1 : +1
			} else if (cA) {
				// Between composites, we sort in decreasing order
				return enumValues.get(b)! - enumValues.get(a)!
			} else {
				// Between non-composites, we sort in increasing order
				return enumValues.get(a)! - enumValues.get(b)!
			}
		})

		const result = keys.reduce(
			(res, key) => {
				const flag = enumValues.get(key)!
				if (flag !== 0 && (res.value & flag) === flag) {
					return {
						value: res.value - flag,
						flags: res.flags.push(key),
					}
				}
				return res
			},
			{ value: value, flags: List<string>() },
		)

		const flags =
			result.value !== 0
				? result.flags.push(result.value.toString())
				: result.flags.count() === 0
				? result.flags.push('0')
				: result.flags
		return flags.join('+')
	}

	return value.toString()
}
