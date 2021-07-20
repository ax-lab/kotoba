import { describe, expect, test } from '../../lib/testutil'

import { LayoutCache } from './layout_cache'

describe('List layout', () => {
	const new_cache = () => new LayoutCache(10)

	test('empty state', () => {
		const cache = new_cache()

		expect(cache.row_height(0)).toEqual(0)
		expect(cache.row_height(1)).toEqual(0)
		expect(cache.row_height(-1)).toEqual(0)

		cache.count = 10
		expect(cache.range_height(0, 0)).toEqual(0)
		expect(cache.range_height(0, 1)).toEqual(10)
		expect(cache.range_height(0, 10)).toEqual(100)
	})

	test('simple rows', () => {
		const cache = new_cache()

		cache.update(2, 15)
		expect(cache.row_height(0)).toEqual(10)
		expect(cache.row_height(2)).toEqual(15)

		expect(cache.range_height(0, 1)).toEqual(10)
		expect(cache.range_height(0, 2)).toEqual(20)
		expect(cache.range_height(0, 3)).toEqual(35)
		expect(cache.range_height(0, 4)).toEqual(35)
		expect(cache.range_height(0, 5)).toEqual(35)

		cache.update(1, 3)
		expect(cache.range_height(0, 5)).toEqual(28)
		expect(cache.range_height(0, 4)).toEqual(28)
		expect(cache.range_height(1, 4)).toEqual(18)
		expect(cache.range_height(2, 4)).toEqual(15)
		expect(cache.range_height(3, 4)).toEqual(0)
		expect(cache.range_height(4, 4)).toEqual(0)
	})
})
