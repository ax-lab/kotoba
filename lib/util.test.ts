import { describe, expect, test } from './testutil'
import { bytes, duration, escape_regex } from './util'

describe('lib/util', () => {
	test('bytes', () => {
		expect(bytes(0)).toBe('0 bytes')
		expect(bytes(1)).toBe('1 byte')
		expect(bytes(2)).toBe('2 bytes')
		expect(bytes(1023)).toBe('1023 bytes')
		expect(bytes(1024)).toBe('1.0KB')
		expect(bytes(2048)).toBe('2.0KB')
		expect(bytes(2048 + 512)).toBe('2.5KB')

		expect(bytes(1024 * 1024)).toBe('1.00MB')
		expect(bytes(2.0 * 1024 * 1024)).toBe('2.00MB')
		expect(bytes(2.5 * 1024 * 1024)).toBe('2.50MB')

		expect(bytes(1024 * 1024 * 1024)).toBe('1.00GB')
		expect(bytes(2.0 * 1024 * 1024 * 1024)).toBe('2.00GB')
		expect(bytes(2.5 * 1024 * 1024 * 1024)).toBe('2.50GB')
	})

	test('duration', () => {
		expect(duration(0)).toBe('0s')
		expect(duration(0.0000001)).toBe('0s')

		// Nanosecond range
		expect(duration(0.0001)).toBe('100ns')
		expect(duration(0.0005)).toBe('500ns')
		expect(duration(0.0009)).toBe('900ns')
		expect(duration(0.0015)).toBe('1.5us')
		expect(duration(0.0099)).toBe('9.9us')

		// Microsecond range
		expect(duration(0.001)).toBe('1.0us')
		expect(duration(0.0015)).toBe('1.5us')
		expect(duration(0.0099)).toBe('9.9us')
		expect(duration(0.01)).toBe('10us')
		expect(duration(0.0124)).toBe('12us')
		expect(duration(0.0125)).toBe('13us')

		expect(duration(0.999)).toBe('999us')
		expect(duration(1.125)).toBe('1.125ms')
		expect(duration(9.999)).toBe('9.999ms')

		expect(duration(10.1)).toBe('10.1ms')
		expect(duration(99.9)).toBe('99.9ms')

		expect(duration(100.4)).toBe('100ms')
		expect(duration(100.5)).toBe('101ms')
		expect(duration(999.4)).toBe('999ms')
		expect(duration(999.5)).toBe('1.000s')

		// Second range
		expect(duration(1001.5)).toBe('1.002s')
		expect(duration(9999.4)).toBe('9.999s')

		expect(duration(10100)).toBe('10.1s')
		expect(duration(59949)).toBe('59.9s')

		// Minute range
		expect(duration(60000)).toBe('1m00s')
		expect(duration(61499)).toBe('1m01s')
		expect(duration(61500)).toBe('1m02s')

		expect(duration(135000)).toBe('2m15s')
	})

	test('escape_regex', () => {
		const src = `^ $ * + ? . ( ) | { } [ ] [[]] \\`
		const out = `\\^ \\$ \\* \\+ \\? \\. \\( \\) \\| \\{ \\} \\[ \\] \\[\\[\\]\\] \\\\`
		expect(escape_regex(src)).toBe(out)
	})
})
