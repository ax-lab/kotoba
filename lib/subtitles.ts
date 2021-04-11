/**
 * Available edit operations for subtitles.
 */
export type SubtitleEdit = SubEditSyncStart | SubEditSyncEnd | SubEditDelete | SubEditChange

export type SubEditSyncStart = {
	type: 'start'
	line: number
	to_position: number
	mode?: 'all' | 'forward' | 'single'
}

export type SubEditSyncEnd = {
	type: 'end'
	line: number
	to_position: number
}

export type SubEditDelete = {
	type: 'delete'
	line: number
}

export type SubEditChange = {
	type: 'change'
	line: number
	text_raw?: string
	start?: number
	end?: number
}

/**
 * Allows editing of a SubtitleFile.
 */
export class SubtitleEditor {
	readonly file: SubtitleFile
	readonly edits: SubtitleEdit[] = []

	constructor(file: SubtitleFile) {
		this.file = file
	}

	apply(edit: SubtitleEdit) {
		if (this.do_apply(edit)) {
			this.edits.push(edit)
			return true
		}
		return false
	}

	private do_apply(edit: SubtitleEdit) {
		const dialog = this.file.dialogues.find((x) => x.line_start == edit.line)
		if (!dialog) {
			return false
		}

		switch (edit.type) {
			case 'change':
				if (edit.start == null && edit.end == null && !edit.text_raw) {
					return false
				}
				this.file.update({
					line: dialog.line_start,
					start: edit.start,
					end: edit.end,
					text_raw: edit.text_raw,
				})
				return true
			case 'delete':
				this.file.update({ line: dialog.line_start, delete: true })
				return true
			case 'end':
				if (edit.to_position <= dialog.start.time) {
					return false
				}
				this.file.update({
					line: dialog.line_start,
					end: edit.to_position,
				})
				return true
			case 'start': {
				const delta = edit.to_position - dialog.start.time
				const list =
					edit.mode == 'all'
						? this.file.dialogues
						: edit.mode == 'forward'
						? this.file.dialogues.filter((x) => x.start.time >= dialog.start.time)
						: [dialog]
				if (!list.length) {
					return false
				}
				this.file.update(
					...list.map<SubtitleDialogUpdate>((x) => ({
						line: x.line_start,
						start: x.start.time + delta,
						end: x.end.time + delta,
					})),
				)
				return true
			}
		}
		return false
	}
}

/**
 * Handle subtitles from a file.
 */
export class SubtitleFile {
	/** Subtitle file name. */
	readonly name: string
	/** Subtitle format. */
	readonly format: 'ass' | 'srt'

	private lines: string[] // Raw lines from the file
	private parser: SubParser // The parser to use for this subtitle format

	_dialogues?: SubtitleDialog[]

	/**
	 * All lines of dialog from the subtitle file sorted by time.
	 */
	get dialogues() {
		if (this._dialogues == null) {
			this._dialogues = this.parser.parse_dialog(this.lines)
			this.sort_dialogues()
		}
		return [...this._dialogues]
	}

	/**
	 * Returns the raw text for the subtitle file.
	 */
	get text() {
		return this.lines.join('\n')
	}

	constructor(name: string, data: string, format?: 'ass' | 'srt') {
		this.name = name
		if (format) {
			this.format = format
		} else {
			if (/\.srt$/i.test(name)) {
				this.format = 'srt'
			} else if (/\.ass$/i.test(name)) {
				this.format = 'ass'
			} else {
				throw new Error(`could not load ${name} subtitles: invalid format`)
			}
		}
		switch (this.format) {
			case 'srt':
				this.parser = new SubParserSRT()
				break
			case 'ass':
				this.parser = new SubParserASS()
				break
		}
		this.lines = data.split(/\r\n?|\n/)
	}

	/**
	 * Apply updates to the subtitle content.
	 */
	update(...updates: SubtitleDialogUpdate[]) {
		// Map the updates per source line
		const per_line = new Map<number, SubtitleDialogUpdate>()
		for (const it of updates) {
			per_line.set(it.line, it)
		}

		// Get all available dialog, sorted by source line
		const ls = this.dialogues
		ls.sort((a, b) => a.line_start - b.line_start)

		// Apply the updates in order
		let line_offset = 0
		this._dialogues = ls
			.map((dialog) => {
				const update = per_line.get(dialog.line_start)

				// apply the offset of added/removed lines from previous updates
				dialog.line_start += line_offset
				if (update) {
					update.line += line_offset // just for consistency

					// Apply the update
					const src = this.lines.slice(dialog.line_start, dialog.line_start + dialog.line_count)
					const src_count = src.length
					const lines = update.delete ? [] : this.parser.update(update, dialog, src)

					// Insert the resulting text lines into the raw array
					this.lines.splice(dialog.line_start, src_count, ...lines)

					// Update line count and offset
					line_offset += lines.length - src_count
					dialog.line_count = lines.length
				}
				return dialog
			})
			.filter((x) => x.line_count > 0)
		this.sort_dialogues()
	}

	private sort_dialogues() {
		this._dialogues &&
			this._dialogues.sort((a, b) => {
				if (a.start.time != b.start.time) {
					return a.start.time - b.start.time
				} else if (a.end.time != b.end.time) {
					return a.end.time - b.end.time
				} else {
					return a.line_start - b.line_start
				}
			})
	}
}

/** Timing information for a subtitle */
type SubtitleTime = {
	/**
	 * Raw timestamp string, as it appears on the file. Format specific.
	 */
	text: string
	/**
	 * Timestamp in seconds from the start of the file.
	 */
	time: number
}

/** A single dialog from a Subtitle */
export type SubtitleDialog = {
	/** Line index of this entry. This is unique across all entries. */
	line_start: number
	/** Number of lines for this entry. */
	line_count: number
	/** The parsed dialog text without formatting or markers. */
	text: string
	/** Raw dialog text, including formatting and markers. */
	text_raw: string
	/** Start time for the subtitle dialog. */
	start: SubtitleTime
	/** End time for the subtitle dialog. */
	end: SubtitleTime
}

type SubtitleDialogUpdate = {
	line: number
	text_raw?: string
	start?: number
	end?: number
	delete?: boolean
}

/** Parser for a subtitle file. */
interface SubParser {
	/** Parse the raw lines of the file and extract dialogue. */
	parse_dialog(lines: string[]): SubtitleDialog[]

	/**
	 * Apply the given update to the dialog. This will update the target dialog
	 * and also return the raw text lines for the format.
	 */
	update(update: SubtitleDialogUpdate, target: SubtitleDialog, src_lines: string[]): string[]
}

class SubParserASS implements SubParser {
	parse_dialog(lines: string[]): SubtitleDialog[] {
		const out: SubtitleDialog[] = []

		// Note on this parsing: we are not considering some possibly relevant
		// fields from the `[Script Info]` section, which may affect the parsing
		// and timing of the subtitles. They are:
		//
		// Timer:
		//     This is the Timer Speed for the script, as a percentage (eg.
		//     "100.0000" is exactly 100%. The timer speed is a time multiplier
		//     applied to the clock to stretch or compress the duration of a
		//     script. A speed greater than 100% will reduce the overall
		//     duration, and means that subtitles will progressively appear
		//     sooner and sooner. A speed less than 100% will increase the
		//     overall duration of the script means subtitles will progressively
		//     appear later and later (like a positive ramp time).
		//
		//     The stretching or compressing only occurs during script playback,
		//     this value does not change the actual timings for each event
		//     listed in the script.
		//
		// WrapStyle:
		//     Defines the default wrapping style.
		//     0: smart wrapping, lines are evenly broken
		//     1: end-of-line word wrapping, only \N breaks
		//     2: no word wrapping, \n \N both breaks
		//     3: same as 0, but lower line gets wider.

		let is_events = false
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()

			// We only care about the `[Events]` section
			if (/^\[Events\]$/i.test(line)) {
				is_events = true
			} else if (/^\[[a-z]+\]$/.test(line)) {
				is_events = false
			} else if (!is_events) {
				continue
			}

			// For a dialogue the fields are:
			// - Field 1: Marked (Marked=0 or Marked=1)
			// - Field 1: Layer (any integer)
			//     Subtitles having different layer number will be ignored
			//     during the collision detection. Higher numbered layers
			//     will be drawn over the lower numbered.
			//
			// - Field 2: Start
			// - Field 3: End
			//     Start and End Time of the Event, in 0:00:00:00 format
			//     (i.e. Hrs:Mins:Secs:hundredths)
			//
			//     NOTE: it is not in the spec, but some sources use a `.` for
			//     the hundredths
			//
			// - Field 4: Style
			// - Field 5: Character name (information only).
			//
			// - Field 6: MarginL
			// - Field 7: MarginR
			// - Field 8: MarginV
			//     4-figure Left/Right/Bottom Margin overrides. The values
			//     are in pixels.All zeroes means the style's default.
			//
			// - Field 9: Transition Effect
			//
			// - Field 10: Text
			//     Subtitle Text. This is the actual text which will be
			//     displayed as a subtitle onscreen. Everything after the
			//     9th comma is treated as the subtitle text, so it can
			//     include commas.
			//
			//     The text can include \n codes which is a line break, and
			//     can include Style Override control codes, which appear
			//     between braces { }.

			if (/^Dialogue:/i.test(line)) {
				const fields = line.replace(/^Dialogue:/i, '').split(',')
				if (fields.length < 10) {
					continue
				}

				const start = this.parse_time(fields[1])
				const end = this.parse_time(fields[2])
				const text_raw = fields.slice(9).join(',')
				const text = this.strip_format(text_raw)

				if (text.trim()) {
					out.push({
						line_start: i,
						line_count: 1,
						start,
						end,
						text_raw,
						text,
					})
				}
			}
		}
		return out
	}

	update(update: SubtitleDialogUpdate, target: SubtitleDialog, src_lines: string[]): string[] {
		const fields = src_lines[0].replace(/^Dialogue:\s*/i, '').split(',') // source is always a single line
		const to_time = (time: number) => {
			const pad = (n: number) => n.toString().padStart(2, '0')
			const hs = Math.floor((time % 1) * 100)
			const h = Math.floor(time / 3600)
			const m = Math.floor((time / 60) % 60)
			const s = Math.floor(time % 60)
			return `${h}:${pad(m)}:${pad(s)}:${pad(hs)}`
		}
		if (update.start != null) {
			const time = to_time(update.start)
			fields[1] = time
			target.start.text = time
			target.start.time = update.start
		}
		if (update.end != null) {
			const time = to_time(update.end)
			fields[2] = time
			target.end.text = time
			target.end.time = update.end
		}
		if (update.text_raw) {
			target.text_raw = update.text_raw.replace(/\r\n?|\n/g, '\\N')
			target.text = this.strip_format(target.text_raw)
			fields.length = 9 // text could have commas as well
			fields.push(target.text_raw)
		}
		return ['Dialogue: ' + fields.join(',')]
	}

	parse_time(input: string): SubtitleTime {
		// Format `0:00:00:00` - Hrs:Mins:Secs:hundredths
		const ls = input.split(/[,.:]/)
		const hs = parseInt(ls.pop() || '', 10) || 0
		const s = parseInt(ls.pop() || '', 10) || 0
		const m = parseInt(ls.pop() || '', 10) || 0
		const h = parseInt(ls.pop() || '', 10) || 0
		return {
			text: input,
			time: s + m * 60 + h * 3600 + hs / 100,
		}
	}

	strip_format(input: string) {
		const NB_SPC = '\u{00A0}'
		const SHY = '\u{00AD}' // soft-hyphen
		// \N - hard line break; \n - soft line break; \h - non-breaking space
		const txt = input.replace(/\{[^}]*\}/g, (s) => {
			if (/\\N/.test(s)) {
				return '\n'
			} else if (/\\n/.test(s)) {
				return SHY
			} else if (/\\h/.test(s)) {
				return NB_SPC
			}
			return ''
		})
		return txt.replace(/\\N/g, '\n').replace(/\\h/g, NB_SPC).replace(/\\n/g, SHY)
	}
}

/**
 * Parser for the SRT file format.
 */
class SubParserSRT implements SubParser {
	parse_dialog(lines: string[]): SubtitleDialog[] {
		const out: SubtitleDialog[] = []

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()

			// Check for the incremental counter that marks the beginning of a
			// group
			if (/^\d+$/.test(line)) {
				const pos = i++

				// Parse the timestamp. Examples:
				//     00:00:14,948 --> 00:00:18,247
				//     00:00:14,948 --> 00:00:18,247 X1:201 X2:516 Y1:397 Y2:423)
				const time = (lines[i++] || '')
					.replace(/([XY][\d+]:\d+)/g, '')
					.trim()
					.split('-->')
					.map((x) => this.parse_time(x))

				// Push the text until it finds an empty line.
				const text: string[] = []
				while (i < lines.length && lines[i].trim()) {
					text.push(lines[i])
					i++
				}

				if (text.length && time.length == 2) {
					const raw = text.join('\n')
					out.push({
						line_start: pos,
						line_count: i - pos,
						start: time[0],
						end: time[1],
						text_raw: raw,
						text: this.strip_format(raw),
					})
				}
			}
		}

		return out
	}

	update(update: SubtitleDialogUpdate, target: SubtitleDialog, src_lines: string[]): string[] {
		const to_time = (time: number) => {
			const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
			const ms = Math.floor((time % 1) * 1000)
			const h = Math.floor(time / 3600)
			const m = Math.floor((time / 60) % 60)
			const s = Math.floor(time % 60)
			return `${h}:${pad(m)}:${pad(s)},${pad(ms, 3)}`
		}
		if (update.start != null) {
			const time = to_time(update.start)
			src_lines[1] = src_lines[1].replace(target.start.text, time)
			target.start.text = time
			target.start.time = update.start
		}
		if (update.end != null) {
			const time = to_time(update.end)
			src_lines[1] = src_lines[1].replace(target.end.text, time)
			target.end.text = time
			target.end.time = update.end
		}
		if (update.text_raw) {
			const new_lines = update.text_raw.split(/\r\n?|\n/).filter((x) => x.trim())
			if (new_lines.length) {
				target.text_raw = new_lines.join('\n')
				target.text = this.strip_format(target.text_raw)
				src_lines.length = 2
				src_lines.push(...new_lines)
			}
		}
		return src_lines
	}

	parse_time(input: string): SubtitleTime {
		input = input.trim()
		const [time_main, time_msec] = input.split(',')
		const ts = time_main.split(':')
		const ms = parseInt(time_msec, 10) / 1000 || 0
		const s = parseInt(ts.pop() || '', 10) || 0
		const m = parseInt(ts.pop() || '', 10) || 0
		const h = parseInt(ts.pop() || '', 10) || 0
		return {
			text: input,
			time: ms + s + m * 60 + h * 3600,
		}
	}

	strip_format(input: string) {
		// Remove formatting flags in the text
		return input
			.replace(/<[/]?(b|i|u|font)\s*>|\{[/]?(b|i|u)\}/gi, '')
			.replace(/<font(\s*[a-z]+(=('[^']*'|"[^"]*"))?)*\s*>/gi, '')
	}
}
