export function make_filter(text: string) {
	function escape(text: string, glob = false): string {
		return text.trim().replace(/\\[\\?*]|[.(){|}+?*^$[\]]/g, (s) => {
			if (s.startsWith('\\') && s.length > 1) {
				return glob ? escape(s.slice(1)) : '\\\\' + escape(s.slice(1))
			}
			if (glob) {
				switch (s) {
					case '?':
						return '.'
					case '*':
						return '.*'
				}
			}
			return `\\${s}`
		})
	}

	const re = escape(text, true)
	return re ? new RegExp(`^\\s*${re}\\s*$`, 'iu') : /^/
}
