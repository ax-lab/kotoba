/**
 * Group a list by the given key/value function.
 */
export function group_by<L, T, K>(input: L[], pair: (input: L) => [K, T]): Map<K, T[]> {
	const out = new Map<K, T[]>()
	for (const it of input) {
		const [k, v] = pair(it)
		const ls = out.get(k)
		if (!ls) {
			out.set(k, [v])
		} else {
			ls.push(v)
		}
	}
	return out
}
