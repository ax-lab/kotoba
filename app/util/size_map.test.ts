import { Range } from 'immutable'
import Random from 'seedrandom'

import { describe, expect, test } from '../../lib-ts/testutil'

import { SizeMap } from './size_map'

const DEBUG_TIME = false

describe('SizeMap', () => {
	const time = DEBUG_TIME ? console.time.bind(console) : () => void 0
	const timeEnd = DEBUG_TIME ? console.timeEnd.bind(console) : () => void 0

	const shuffle = (seed: string, indexes: number[]) => {
		const random = Random(seed)
		for (let i = indexes.length - 1; i > 0; i--) {
			const p = Math.floor(random() * (i + 1))
			const a = indexes[p]
			indexes[p] = indexes[i]
			indexes[i] = a
		}
	}

	test('empty state', () => {
		const m = new SizeMap()

		expect(m.get_size(0)).toBeUndefined()
		expect(m.get_size(1)).toBeUndefined()
		expect(m.get_size(-1)).toBeUndefined()

		m.trim(10)
		expect(m.length).toEqual(10)
		expect(m.get_size(0)).toBeUndefined()
		expect(m.get_size(1)).toBeUndefined()
		expect(m.get_size(9)).toBeUndefined()
		expect(m.get_size(10)).toBeUndefined()
	})

	test('item size (basic)', () => {
		const m = new SizeMap()

		m.set_size(1, 10)
		m.set_size(3, 30)
		m.set_size(5, 50)
		m.set_size(7, 70)

		expect(m.length).toEqual(8)

		expect(m.get_size(0)).toBeUndefined()
		expect(m.get_size(2)).toBeUndefined()
		expect(m.get_size(4)).toBeUndefined()
		expect(m.get_size(6)).toBeUndefined()
		expect(m.get_size(8)).toBeUndefined()

		expect(m.get_size(1)).toEqual(10)
		expect(m.get_size(3)).toEqual(30)
		expect(m.get_size(5)).toEqual(50)
		expect(m.get_size(7)).toEqual(70)

		expect(m.get_range_size(0, 8, 1)).toEqual(10 + 30 + 50 + 70 + 4)

		m.set_size(1, 999)
		expect(m.length).toEqual(8)
		expect(m.get_size(1)).toEqual(999)

		expect(m.get_range_size(0, 8, 1)).toEqual(999 + 30 + 50 + 70 + 4)
	})

	test('item size (large)', () => {
		const m = new SizeMap()

		m.set_size(1, 1.1)
		m.set_size(2, 2.2)
		m.set_size(3, 3.3)

		m.set_size(10, 10.1)
		m.set_size(20, 20.2)
		m.set_size(30, 30.3)

		m.set_size(100, 100.1)
		m.set_size(200, 200.2)
		m.set_size(300, 300.3)

		m.set_size(1000, 1000.1)
		m.set_size(2000, 2000.2)
		m.set_size(3000, 3000.3)

		m.set_size(10000, 10000.1)
		m.set_size(20000, 20000.2)
		m.set_size(30000, 30000.3)

		m.set_size(100000, 100000.1)
		m.set_size(200000, 200000.2)
		m.set_size(300000, 300000.3)

		m.set_size(1000000, 1000000.1)
		m.set_size(2000000, 2000000.2)
		m.set_size(3000000, 3000000.3)

		expect(m.length).toEqual(3000001)

		expect(m.get_size(1)).toEqual(1.1)
		expect(m.get_size(2)).toEqual(2.2)
		expect(m.get_size(3)).toEqual(3.3)
		expect(m.get_range_size(1, 4, 100)).toEqual(6.6)

		expect(m.get_size(10)).toEqual(10.1)
		expect(m.get_size(20)).toEqual(20.2)
		expect(m.get_size(30)).toEqual(30.3)
		expect(m.get_range_size(10, 31, 100)).toEqual(60.6 + (21 - 3) * 100)

		expect(m.get_size(100)).toEqual(100.1)
		expect(m.get_size(200)).toEqual(200.2)
		expect(m.get_size(300)).toEqual(300.3)
		expect(m.get_range_size(100, 301, 100)).toEqual(600.6 + (201 - 3) * 100)

		expect(m.get_size(1000)).toEqual(1000.1)
		expect(m.get_size(2000)).toEqual(2000.2)
		expect(m.get_size(3000)).toEqual(3000.3)
		expect(m.get_range_size(1000, 3001, 10)).toEqual(6000.6 + (2001 - 3) * 10)

		expect(m.get_size(10000)).toEqual(10000.1)
		expect(m.get_size(20000)).toEqual(20000.2)
		expect(m.get_size(30000)).toEqual(30000.3)
		expect(m.get_range_size(10000, 30001, 10)).toEqual(60000.6 + (20001 - 3) * 10)

		expect(m.get_size(100000)).toEqual(100000.1)
		expect(m.get_size(200000)).toEqual(200000.2)
		expect(m.get_size(300000)).toEqual(300000.3)
		expect(m.get_range_size(100000, 300001, 10)).toEqual(600000.6 + (200001 - 3) * 10)

		expect(m.get_size(1000000)).toEqual(1000000.1)
		expect(m.get_size(2000000)).toEqual(2000000.2)
		expect(m.get_size(3000000)).toEqual(3000000.3)
		expect(m.get_range_size(1000000, 3000001, 10)).toEqual(6000000.6 + (2000001 - 3) * 10)
	})

	test('full load', () => {
		const LENGTH = 3000
		const X = 999

		// Randomize the indexes to insert
		const indexes = Range(0, LENGTH).toArray()
		shuffle('full load 1', indexes)

		//--------------------------------------------------------------------//
		// Initial setup
		//--------------------------------------------------------------------//

		time('building')

		let total = 0

		const node = new SizeMap()
		for (const it of indexes) {
			node.set_size(it, it + 1)
			total += it + 1
		}

		timeEnd('building')

		expect(node.length).toEqual(LENGTH)
		node.check_valid()

		//--------------------------------------------------------------------//
		// Query sizes
		//--------------------------------------------------------------------//

		time('queries')

		expect(node.get_range_size(0, LENGTH, X)).toEqual(total)

		let sum = 0
		for (let it = 0; it < LENGTH; it++) {
			sum += it + 1
			expect(node.get_size(it)).toEqual(it + 1)
			expect(node.get_range_size(0, it + 1, X)).toEqual(sum)
			expect(node.get_range_size(it + 1, LENGTH, X)).toEqual(total - sum)
		}

		timeEnd('queries')

		//--------------------------------------------------------------------//
		// Doubling
		//--------------------------------------------------------------------//

		shuffle('full load 2', indexes)

		time('doubling')
		for (const it of indexes) {
			node.set_size(it, (it + 1) * 2)
		}
		total *= 2
		timeEnd('doubling')

		expect(node.length).toEqual(LENGTH)
		node.check_valid()

		time('double queries')
		expect(node.get_range_size(0, LENGTH, X)).toEqual(total)
		sum = 0
		for (let it = 0; it < LENGTH; it++) {
			sum += (it + 1) * 2
			expect(node.get_size(it)).toEqual((it + 1) * 2)
			expect(node.get_range_size(0, it + 1, X)).toEqual(sum)
			expect(node.get_range_size(it + 1, LENGTH, X)).toEqual(total - sum)
		}

		timeEnd('double queries')
	})

	test('sparse', () => {
		const RANGE = 10000000
		const X = 10

		const random = Random('sparse gen')
		const all_indexes = new Set<number>()
		while (all_indexes.size < 1000) {
			const index = Math.floor(random() * RANGE)
			all_indexes.add(index)
		}

		// Randomize the indexes to insert
		const indexes = [...all_indexes.values()]
		shuffle('sparse 1', indexes)

		//--------------------------------------------------------------------//
		// Initial setup
		//--------------------------------------------------------------------//

		time('building')

		let total = 0

		const node = new SizeMap()
		for (const it of indexes) {
			node.set_size(it, it * 10)
			total += it * 10
		}
		total += (node.length - indexes.length) * X

		timeEnd('building')

		const length = Math.max(...all_indexes.values()) + 1
		expect(node.length).toEqual(length)
		node.check_valid()

		//--------------------------------------------------------------------//
		// Query sizes
		//--------------------------------------------------------------------//

		time('queries')

		expect(node.get_range_size(0, length, X)).toEqual(total)

		const sorted_indexes = [...all_indexes.values()].sort((a, b) => a - b)
		let sum = 0
		let cnt = 0
		for (const it of sorted_indexes) {
			const max = it + 1
			expect(node.get_size(it)).toEqual(it * 10)
			sum += it * 10
			cnt += 1

			const expected_sum = sum + (max - cnt) * X
			expect(node.get_range_size(0, max, X)).toEqual(expected_sum)
			expect(node.get_range_size(max, RANGE, X)).toEqual(total - expected_sum)
		}

		timeEnd('queries')

		//--------------------------------------------------------------------//
		// Doubling
		//--------------------------------------------------------------------//

		shuffle('sparse 2', indexes)

		time('doubling')
		total = 0
		for (const it of indexes) {
			node.set_size(it, it * 20)
			total += it * 20
		}
		total += (node.length - indexes.length) * X

		timeEnd('doubling')

		expect(node.get_range_size(0, length, X)).toEqual(total)
		node.check_valid()

		time('double queries')
		sum = 0
		cnt = 0
		for (const it of sorted_indexes) {
			const max = it + 1
			expect(node.get_size(it)).toEqual(it * 20)
			sum += it * 20
			cnt += 1

			const expected_sum = sum + (max - cnt) * X
			expect(node.get_range_size(0, max, X)).toEqual(expected_sum)
			expect(node.get_range_size(max, RANGE, X)).toEqual(total - expected_sum)
		}

		timeEnd('double queries')
	})

	test('trim', () => {
		const RANGE = 100000000

		const random = Random('trim sparse gen')
		const all_indexes = new Set<number>()
		while (all_indexes.size < 500) {
			const index = Math.floor(random() * RANGE)
			all_indexes.add(index)
		}

		// Randomize the indexes to insert
		const indexes = [...all_indexes.values()].sort((a, b) => a - b)

		//--------------------------------------------------------------------//
		// Initial setup
		//--------------------------------------------------------------------//

		const node1 = new SizeMap()
		const node2 = new SizeMap()

		for (let i = 0; i < indexes.length; i++) {
			const it = indexes[i]
			node1.set_size(it, it * 10)
			node2.set_size(it, it * 10)
		}

		const length = Math.max(...all_indexes.values()) + 1
		expect(node1.length).toEqual(length)
		node1.check_valid()

		// Do a big trim to ensure we trigger whole-block elimination logic
		const target = indexes[Math.floor(indexes.length / 3)]
		node2.trim(target)
		expect(node2.length).toEqual(target)
		node2.check_valid()

		// Full trim
		node2.trim(0)
		expect(node2.length).toEqual(0)
		node2.check_valid()

		//--------------------------------------------------------------------//
		// Trim to each size
		//--------------------------------------------------------------------//

		for (const it of indexes.reverse()) {
			node1.trim(it + 1)
			expect(node1.length).toEqual(it + 1)
			node1.check_valid()
		}
	})
})
