/**
 * Number of elements in a bucket inside a block in a `SizeMap`.
 *
 * This value should be kept relatively low, as the most expensive operations
 * in `SizeMap` are `O(N + BUCKETS_PER_BLOCK + BUCKET_SIZE)` where N is the
 * number of blocks and is generally expected to be small.
 */
const BUCKET_SIZE = 50

/**
 * Number of buckets in a block in a `SizeMap`.
 *
 * This value should be kept relatively low, as the most expensive operations
 * in `SizeMap` are `O(N + BUCKETS_PER_BLOCK + BUCKET_SIZE)` where N is the
 * number of blocks and is generally expected to be small.
 */
const BUCKETS_PER_BLOCK = 50

const BLOCK_SIZE = BUCKET_SIZE * BUCKETS_PER_BLOCK

/**
 * Stores the size of a collection of items by index and allows querying the
 * size by range.
 *
 * This data structure is optimized for usage by the virtual list layout. In
 * particular:
 *
 * - Efficient sparse storage.
 * - `O(1)` single row queries and updates.
 * - `O(1)` list, block, and bucket size querying.
 * - `O(1)` querying for the entire range size.
 * - `O(N + BUCKETS_PER_BLOCK + BUCKET_SIZE)` for a partial range size query,
 *   where N is the number of blocks covered by the range (under normal usage
 *   this is expected to be vastly smaller than the number of items).
 */
export class SizeMap {
	private readonly blocks = new Map<number, Block>()

	private _length = 0

	private _count = 0 // Number of items actually stored in the sparse map
	private _total = 0 // Sum of the stored items

	/**
	 * Return the highest item index + 1 or the length set by `trim` (whichever
	 * one is higher).
	 *
	 * This operation is `O(1)`.
	 */
	get length() {
		return this._length
	}

	/**
	 * Return the stored size of an item or undefined if it is not stored.
	 *
	 * This operation is `O(1)`.
	 */
	get_size(index: number): number | undefined {
		const block_index = Math.floor(index / BLOCK_SIZE)
		const block = this.blocks.get(block_index)
		if (block == null) {
			return
		}

		const bucket_index = Math.floor(index / BUCKET_SIZE)
		const bucket = block.buckets.get(bucket_index)
		if (bucket == null) {
			return
		}

		return bucket.items.get(index)
	}

	/**
	 * Stores or updates the size of an item. Returns the old value, if any.
	 *
	 * This operation is `O(1)`.
	 */
	set_size(index: number, size: number) {
		const block_index = Math.floor(index / BLOCK_SIZE)
		const block =
			this.blocks.get(block_index) ||
			(() => {
				const out: Block = {
					count: 0,
					total: 0,
					buckets: new Map<number, Bucket>(),
				}
				this.blocks.set(block_index, out)
				return out
			})()

		const bucket_index = Math.floor(index / BUCKET_SIZE)
		const bucket =
			block.buckets.get(bucket_index) ||
			(() => {
				const out: Bucket = {
					total: 0,
					items: new Map<number, number>(),
				}
				block.buckets.set(bucket_index, out)
				return out
			})()

		const old = bucket.items.get(index)

		bucket.items.set(index, size)
		this._length = Math.max(this._length, index + 1)

		if (old == null) {
			this._count += 1
			this._total += size
			block.count += 1
			block.total += size
			bucket.total += size
		} else {
			const diff = size - old
			this._total += diff
			block.total += diff
			bucket.total += diff
		}

		return old
	}

	get_range_size(start: number, end: number, default_size: number): number {
		const a = Math.min(Math.max(start, 0), this._length)
		const b = Math.max(Math.min(end, this._length), 0)

		let count = 0
		let total = 0

		// Optimize the case for the whole range.
		if (a == 0 && b == this._length) {
			count = this._count
			total = this._total
		} else {
			// Note that `xyz_b` is always exclusive
			const block_a = Math.floor(a / BLOCK_SIZE)
			const block_b = Math.ceil(b / BLOCK_SIZE)

			// We iterate the blocks sequentially because for the most part
			// range queries should cover a small number of the total blocks
			// (except for the full-range query covered above).
			for (let i = block_a; i < block_b; i++) {
				const block = this.blocks.get(i)
				if (block) {
					// Optimize the case for the whole block, which are all but
					// the first and last.
					if (i > block_a && i < block_b - 1) {
						count += block.count
						total += block.total
					} else {
						// In a partially covered block, compute the size of
						// each bucket individually. Given the number of
						// buckets should be small, we just iterate them all.
						for (const [k, bucket] of block.buckets) {
							const bucket_a = k * BUCKET_SIZE
							const bucket_b = bucket_a + BUCKET_SIZE
							// Optimize the case for the whole bucket
							if (bucket_a >= a && bucket_b <= b) {
								count += bucket.items.size
								total += bucket.total
							} else if ((a >= bucket_a && a < bucket_b) || (b > bucket_a && b <= bucket_b)) {
								// Compute the size of each row
								for (const [row, size] of bucket.items) {
									if (row >= a && row < b) {
										count += 1
										total += size
									}
								}
							}
						}
					}
				}
			}
		}

		// Total size of available items + (unavailable items x default size)
		return total + (b - a - count) * default_size
	}

	/**
	 * Trim the map to the given length. This will exclude any stored items
	 * with index above the given length and will update length to the given
	 * value.
	 *
	 * This operates on `O(N + BUCKETS_PER_BLOCK + BUCKET_SIZE)`.
	 */
	trim(length: number) {
		length = Math.max(0, length)
		if (length == 0) {
			this.blocks.clear()
			this._total = 0
			this._count = 0
		} else if (length < this._length) {
			// Trim all blocks, buckets, and items, starting at the block level.
			//
			// We assume that under normal conditions the structure is sparsely
			// populated, so iterating key by key is the best approach.
			//
			// Even on a worst case scenario of truncating a fully populated
			// very large list of items to a non-zero but small size, the speed
			// up provided by BLOCKS x BUCKETS should keep things manageable.
			for (const [block_pos, block] of this.blocks) {
				const block_min = block_pos * BLOCK_SIZE
				const block_max = block_min + BLOCK_SIZE
				if (block_min >= length) {
					// The entire block is out of range
					this.blocks.delete(block_pos)
					this._total -= block.total
					this._count -= block.count
				} else if (block_max > length) {
					// The block is partially out of range, so trim the buckets
					for (const [bucket_pos, bucket] of block.buckets) {
						const bucket_min = bucket_pos * BUCKET_SIZE
						const bucket_max = bucket_min + BUCKET_SIZE
						if (bucket_min >= length) {
							// The entire bucket is out of range
							block.buckets.delete(bucket_pos)
							block.total -= bucket.total
							this._total -= bucket.total
							block.count -= bucket.items.size
							this._count -= bucket.items.size
						} else if (bucket_max > length) {
							// The bucket is partially out of range, trim items
							for (const [index, size] of bucket.items) {
								if (index >= length) {
									bucket.items.delete(index)
									bucket.total -= size
									block.total -= size
									this._total -= size
									block.count -= 1
									this._count -= 1
								}
							}
						}
					}
				}
			}
		}
		this._length = length
	}

	/**
	 * For debugging only. Check the validity of the data structure.
	 */
	check_valid() {
		let total = 0
		let count = 0
		for (const [index, block] of this.blocks) {
			total += block.total
			count += block.count
			check_block(block, index, this._length)
		}

		if (total != this._total) {
			throw new Error(`expected a grand total of ${total} but is ${this._total}`)
		}
		if (count != this._count) {
			throw new Error(`expected a grand count of ${count} but is ${this._count}`)
		}
	}
}

/**
 * A block of buckets provides a secondary level.
 */
type Block = {
	count: number
	total: number
	buckets: Map<number, Bucket>
}

function check_block(block: Block, index: number, length: number) {
	const header = `block ${index}:`
	const min = index * BLOCK_SIZE
	const max = min + BLOCK_SIZE

	if (min >= length) {
		throw new Error(`${header} block exceeds range (${min}~${max} > ${length})`)
	}

	let count = 0
	let total = 0
	for (const [k, bucket] of block.buckets) {
		const bucket_min = k * BUCKET_SIZE
		const bucket_max = bucket_min + BUCKET_SIZE
		if (bucket_min < min || bucket_max > max) {
			throw new Error(`${header} bucket ${k} index out of range (${min}~${max})`)
		}
		check_bucket(header, bucket, k, length)
		count += bucket.items.size
		total += bucket.total
	}

	if (count != block.count || total != block.total) {
		throw new Error(
			`${header} expected count=${block.count} & total=${block.total}, was count=${count} & total=${total}`,
		)
	}
}

/**
 * A bucket store a collection of item sizes for a specific block of entries.
 */
type Bucket = {
	total: number
	items: Map<number, number>
}

function check_bucket(header: string, bucket: Bucket, index: number, length: number) {
	header = `${header} bucket ${index}:`

	const min = index * BUCKET_SIZE
	const max = min + BUCKET_SIZE

	if (min >= length) {
		throw new Error(`${header} bucket exceeds range (${min}~${max} > ${length})`)
	}

	let total = 0
	for (const [k, item] of bucket.items) {
		if (index >= length) {
			throw new Error(`${header} index ${k} exceeds length ${length}`)
		}
		if (k < min || k >= max) {
			throw new Error(`${header} index ${k} out of range (${min}~${max})`)
		}
		total += item
	}
	if (total != bucket.total) {
		throw new Error(`${header} expected total to be ${total}, was ${total}`)
	}
}
