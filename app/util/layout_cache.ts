import { SizeMap } from './size_map'

export class LayoutCache {
	private readonly _map = new SizeMap()

	constructor(base: number) {
		this.base = base
	}

	/**
	 * Provides a base size to use as estimative for rows that haven't been
	 * measured yet.
	 *
	 * Other than affecting the relative scroll sizes, this mostly affects how
	 * many rows are rendered at once in a first layout attempt when row size is
	 * unknown.
	 */
	private readonly base: number

	version = -1

	get count() {
		return this._map.length
	}

	set count(n: number) {
		if (n != this._map.length) {
			this._map.trim(n)
			this.version++
		}
	}

	check_valid() {
		this._map.check_valid()
	}

	update(index: number, height: number) {
		if (index < 0) {
			return
		}

		const old = this._map.set_size(index, height)
		if (old != height) {
			this.version++
		}
	}

	get height() {
		return this._map.get_range_size(0, this.count, this.base)
	}

	range_height(start: number, end: number) {
		return this._map.get_range_size(start, end, this.base)
	}

	row_at(offset: number): [number, number] {
		let a = 0
		let b = this._map.length
		if (offset < 0) {
			return [0, offset]
		}
		while (b > a) {
			const m = Math.floor((a + b) / 2)
			const h = this.range_height(0, m)
			const r = this.row_height(m)
			if (offset >= h && offset < h + r) {
				return [m, offset - h]
			}
			if (offset < h) {
				b = m
			} else {
				a = m + 1
			}
		}
		return [-1, 0]
	}

	row_height(index: number) {
		if (index >= 0 && index < this.count) {
			const out = this._map.get_size(index)
			return out == null ? this.base : out
		}
		return 0
	}
}

export class LayoutNode {
	private rows = new Map<number, number>()
	private list = new Map<number, LayoutNode>()

	private load_factor: number
	private factor = 1

	private range_a = 0
	private range_b = 0
	private total = 0 // size of the entire range
	private count = 0 // number of rows considered in `total`

	constructor(load_factor: number) {
		this.load_factor = load_factor
	}

	/**
	 * Get the size of the given row. Returns `undefined` if not available.
	 */
	get_row(index: number): number | undefined {
		if (this.factor == 1) {
			return this.rows.get(index)
		}
		const pos = Math.floor(index / this.factor)
		return this.list.get(pos)?.get_row(index)
	}

	/**
	 * Removes all row information past the given index.
	 */
	trim_end(end: number) {
		if (end < this.range_a) {
			this.range_a = 0
			this.range_b = 0
			this.total = 0
			this.count = 0
			this.rows.clear()
			this.list.clear()
		} else if (this.factor == 1) {
			for (let it = end; it < this.range_b; it++) {
				const old = this.rows.get(it)
				if (old != null) {
					this.rows.delete(it)
					this.total -= old
					this.count -= 1
				}
			}
		} else {
			const a = Math.floor(end / this.factor)
			const b = Math.ceil(this.range_b / this.factor)
			for (let it = a; it < b; it++) {
				if (it == a) {
					const node = this.list.get(it)
					node && node.trim_end(end)
				} else {
					this.list.delete(it)
				}
			}
		}
	}

	/**
	 * Sets the size of the given row. Returns true if the size actually changed.
	 */
	set_row(index: number, value: number) {
		return this.do_set_row(index, value, true)
	}

	private do_set_row(index: number, value: number, root: boolean): boolean {
		while (root && index >= this.factor * this.load_factor) {
			this.split(this.factor * this.load_factor)
		}

		const old = this.get_row(index)
		if (this.factor <= 1) {
			this.rows.set(index, value)
		} else {
			const pos = Math.floor(index / this.factor)
			const node =
				this.list.get(pos) ||
				(() => {
					const out = new LayoutNode(this.load_factor)
					out.factor = this.factor / this.load_factor
					this.list.set(pos, out)
					return out
				})()
			node.do_set_row(index, value, false)
		}

		// Update the range
		if (this.count == 0) {
			this.range_a = index
			this.range_b = index + 1
		} else {
			this.range_a = Math.min(this.range_a, index)
			this.range_b = Math.max(this.range_b, index + 1)
		}

		// Update the count
		if (old != null) {
			this.total += value - old
		} else {
			this.total += value
			this.count += 1
		}

		return old == null || old != value
	}

	check_all() {
		if (this.factor == 1) {
			const total = Array.from(this.rows.values()).reduce((x, acc) => acc + x)
			if (this.count != this.rows.size) {
				throw 'Invalid count (rows)'
			}
			if (this.total != total) {
				throw 'Invalid total (rows)'
			}

			const idx = Array.from(this.rows.keys())
			const a = Math.min(...idx)
			const b = Math.max(...idx) + 1
			if (a != this.range_a || b != this.range_b) {
				throw `Invalid range (rows)`
			}
		} else {
			for (const it of this.list.values()) {
				it.check_all()
			}

			const nodes = Array.from(this.list.values())
			const total = nodes.map((x) => x.total).reduce((x, acc) => acc + x)
			const count = nodes.map((x) => x.count).reduce((x, acc) => acc + x)
			if (this.count != count) {
				throw 'Invalid count (parent)'
			}
			if (this.total != total) {
				throw 'Invalid total (parent)'
			}

			const a = Math.min(...nodes.map((x) => x.range_a))
			const b = Math.max(...nodes.map((x) => x.range_b))
			if (a != this.range_a || b != this.range_b) {
				throw 'Invalid range (parent)'
			}
		}
	}

	/**
	 * Compute the size of the given range of rows. If rows are not available
	 * uses the `default_size`.
	 *
	 * The `end` parameter is not inclusive.
	 */
	get_range(start: number, end: number, default_size: number): number {
		// Optimize querying for the whole range. This is very important for
		// recursive queries.
		if (start <= this.range_a && end >= this.range_b) {
			return this.total + (end - start - this.count) * default_size
		}

		const [a, b] = this.clip_range(start, end)

		// On leaf nodes we just add the rows one by one
		if (this.factor == 1) {
			let total = 0
			// // prefix range
			// Math.max(this.range_a - start, 0) * default_size -
			// // missing prefix
			// Math.max(this.range_a - end, 0) * default_size +
			// // suffix range
			// Math.max(end - this.range_b, 0) * default_size -
			// // missing suffix
			// Math.max(start - this.range_b, 0) * default_size
			for (let it = start; it < end; it++) {
				const row = this.get_row(it)
				total += row != null ? row : default_size
			}
			return total
		}

		// On an intermediate non-leaf node we need to split the query between
		// the children nodes:

		// Find out the range of child nodes to query. The end of the range is
		// exclusive so we need a `Math.ceil` for it.
		const l = Math.floor(a / this.factor)
		const r = Math.ceil(b / this.factor)

		// Query the child nodes in the range.
		let total = 0
		for (let it = l; it < r; it++) {
			const node = this.list.get(it)
			const a = Math.max(it * this.factor, start)
			const b = Math.min((it + 1) * this.factor, end)
			if (node) {
				// If the child node exists we ask it for its size.
				total += node.get_range(a, b, default_size)
			} else {
				// Otherwise we compute the default size for the range.
				total += default_size * Math.max(b - a, 0)
			}
		}
		return total
	}

	/**
	 * Recursively split the entire node by the given factor.
	 */
	private split(factor: number) {
		if (factor <= this.factor) {
			return
		}

		if (this.factor == 1) {
			// For a leaf node we just need to split the rows.
			for (const [k, v] of this.rows) {
				const pos = Math.floor(k / factor)
				const node =
					this.list.get(pos) ||
					(() => {
						const out = new LayoutNode(this.load_factor)
						this.list.set(pos, out)
						return out
					})()
				node.set_row(k, v)
			}
			this.factor = factor
			this.rows = new Map<number, number>()
		} else {
			// For intermediate nodes we need to split our child between a new
			// set of nodes.
			const new_list = new Map<number, LayoutNode>()
			for (const [k, v] of this.list) {
				const pos = Math.floor(k / factor)
				const node =
					new_list.get(pos) ||
					(() => {
						const out = new LayoutNode(this.load_factor)
						out.factor = this.factor // the child inherits our factor
						new_list.set(pos, out)
						return out
					})()
				node.list.set(k, v)
				node.count += v.count
				node.total += v.total
				node.range_a = Math.min(node.range_a, v.range_a)
				node.range_b = Math.min(node.range_b, v.range_b)
			}
			this.factor = factor
			this.list = new_list
		}
	}

	private clip_range(start: number, end: number): [number, number] {
		if (start >= this.range_b) {
			return [this.range_b, this.range_b]
		}
		if (end <= this.range_a) {
			return [this.range_a, this.range_a]
		}

		const a = Math.max(this.range_a, start)
		const b = Math.min(this.range_b, end)
		return [a, b]
	}
}
