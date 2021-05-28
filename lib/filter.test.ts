import { make_filter } from './filter'
import { describe, expect, test } from './testutil'

describe('lib/filter', () => {
	describe('make_filter', () => {
		const run = (filter: string, args: { pos?: string[]; neg?: string[] }) => {
			const re = make_filter(filter)
			for (const it of args.pos || []) {
				expect(`'${filter}' + '${it}' = ${re.test(it) ? 1 : 0}`).toBe(`'${filter}' + '${it}' = 1`)
			}
			for (const it of args.neg || []) {
				expect(`'${filter}' - '${it}' = ${re.test(it) ? 1 : 0}`).toBe(`'${filter}' - '${it}' = 0`)
			}
		}

		test('empty filter should match all', () => {
			run('', { pos: ['', 'abc'] })
		})

		test('should match literal word', () => {
			run('abc', { pos: ['abc', 'ABC'], neg: ['', 'abcd', 'xabc'] })
		})

		test('should ignore spaces', () => {
			run(' abc ', { pos: ['abc', 'ABC', ' abc', 'abc '] })
		})

		test('should match special characters', () => {
			run('.', { pos: ['.'], neg: ['!'] })
			run('\\', { pos: ['\\'], neg: ['!'] })
			for (const chr of '[](){}^$\\.+-*?|/') {
				run('\\*?'.includes(chr) ? `\\${chr}` : chr, { pos: [chr], neg: ['', '!', chr + '!'] })
			}
			run('/^$./', { pos: ['/^$./'] })
		})

		test('should support multibyte', () => {
			run('𤭢~', { pos: ['𤭢~'], neg: ['𤭢!'] })
		})

		test('should support glob', () => {
			run('a?b?', { pos: ['a1b1', 'a2b2'], neg: ['a1b'] })
			run('a*', { pos: ['a', 'ab', 'abc'], neg: ['123'] })
		})

		test('should support multibyte in glob', () => {
			run('?~', { pos: ['𤭢~'], neg: ['𤭢!'] })
		})
	})
})
