import { describe, expect, test } from '../testutil'

import * as util from './util'

describe('util', () => {
	describe('enumToString', () => {
		enum SomeEnum {
			A,
			B,
			C,
		}

		enum StringEnum {
			A = 'String A',
			B = 'String B',
			C = 'String C',
		}

		enum FlagEnum {
			NONE = 0,
			A = 1,
			B = 2,
			C = 4,
			D = 8,
			AB = A | B,
		}

		test('should support undefined and null', () => {
			expect(util.enumToString(SomeEnum, undefined)).toBe('(undefined)')
			expect(util.enumToString(SomeEnum, null)).toBe('(null)')
		})

		test('should support simple enums', () => {
			expect(util.enumToString(SomeEnum, SomeEnum.A)).toBe('A')
			expect(util.enumToString(SomeEnum, SomeEnum.B)).toBe('B')
			expect(util.enumToString(SomeEnum, SomeEnum.C)).toBe('C')
		})

		test('should support string enums', () => {
			expect(util.enumToString(StringEnum, StringEnum.A)).toBe('String A')
			expect(util.enumToString(StringEnum, StringEnum.B)).toBe('String B')
			expect(util.enumToString(StringEnum, StringEnum.C)).toBe('String C')
		})

		test('should support enum flags', () => {
			expect(util.enumToString(FlagEnum, FlagEnum.NONE, true)).toBe('NONE')
			expect(util.enumToString(FlagEnum, FlagEnum.A, true)).toBe('A')
			expect(util.enumToString(FlagEnum, FlagEnum.B, true)).toBe('B')
			expect(util.enumToString(FlagEnum, FlagEnum.C, true)).toBe('C')
			expect(util.enumToString(FlagEnum, FlagEnum.D, true)).toBe('D')
			expect(util.enumToString(FlagEnum, FlagEnum.AB, true)).toBe('AB')
			expect(util.enumToString(FlagEnum, FlagEnum.A | FlagEnum.B, true)).toBe('AB')
			expect(util.enumToString(FlagEnum, FlagEnum.A | FlagEnum.D, true)).toBe('A+D')
			expect(util.enumToString(FlagEnum, FlagEnum.A | FlagEnum.C | FlagEnum.D, true)).toBe('A+C+D')
			expect(util.enumToString(FlagEnum, FlagEnum.A | FlagEnum.B | FlagEnum.C | FlagEnum.D, true)).toBe('AB+C+D')
		})

		test('should print zero for empty enum', () => {
			enum NoZeroEnum {
				A = 1,
				B = 2,
				C = 3,
			}

			enum NoZeroFlags {
				A = 1,
			}

			expect(util.enumToString(NoZeroEnum, 0)).toBe('0')
			expect(util.enumToString(NoZeroFlags, 0, true)).toBe('0')
		})

		test('should print invalid values', () => {
			expect(util.enumToString(SomeEnum, 3)).toBe('3')
			expect(util.enumToString(StringEnum, 'ABC')).toBe('ABC')
			expect(util.enumToString(StringEnum, '')).toBe('(empty)')

			expect(util.enumToString(FlagEnum, 16, true)).toBe('16')
			expect(util.enumToString(FlagEnum, FlagEnum.A | 16, true)).toBe('A+16')
			expect(util.enumToString(FlagEnum, FlagEnum.A | FlagEnum.B | 16, true)).toBe('AB+16')
		})

		test('should sort flags by value, composite first', () => {
			enum Flags {
				NONE = 0,
				W = 8,
				Z = 1,
				Y = 2,
				X = 4,
				XY = X | Y,
				XZ = X | Z,
				XYZ = X | Y | Z,
			}

			expect(util.enumToString(Flags, 0, true)).toBe('NONE')

			expect(util.enumToString(Flags, Flags.X, true)).toBe('X')
			expect(util.enumToString(Flags, Flags.Y, true)).toBe('Y')
			expect(util.enumToString(Flags, Flags.Z, true)).toBe('Z')
			expect(util.enumToString(Flags, Flags.W, true)).toBe('W')

			expect(util.enumToString(Flags, Flags.X | Flags.Y, true)).toBe('XY')
			expect(util.enumToString(Flags, Flags.X | Flags.Z, true)).toBe('XZ')
			expect(util.enumToString(Flags, Flags.X | Flags.W, true)).toBe('X+W')
			expect(util.enumToString(Flags, Flags.Y | Flags.Z, true)).toBe('Z+Y')
			expect(util.enumToString(Flags, Flags.Y | Flags.W, true)).toBe('Y+W')
			expect(util.enumToString(Flags, Flags.Z | Flags.W, true)).toBe('Z+W')

			expect(util.enumToString(Flags, Flags.X | Flags.Y | Flags.Z, true)).toBe('XYZ')
			expect(util.enumToString(Flags, Flags.X | Flags.Y | Flags.W, true)).toBe('XY+W')
			expect(util.enumToString(Flags, Flags.X | Flags.Z | Flags.W, true)).toBe('XZ+W')
			expect(util.enumToString(Flags, Flags.Y | Flags.Z | Flags.W, true)).toBe('Z+Y+W')

			expect(util.enumToString(Flags, Flags.X | Flags.Y | Flags.Z | Flags.W, true)).toBe('XYZ+W')

			expect(util.enumToString(Flags, Flags.X | Flags.Y | Flags.Z | Flags.W | 16, true)).toBe('XYZ+W+16')
		})
	})
})
