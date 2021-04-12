import React from 'react'

import { SubtitleDialog } from '../../lib'
import { subtitle } from '../api'

import './subtitle_edit_dialog.scss'

const SubtitleEditDialog = ({ dialog, close }: { dialog: SubtitleDialog; close: () => void }) => {
	const start = { value: dialog.start.time }
	const end = { value: dialog.end.time }

	let text = dialog.text

	const save = () => {
		subtitle
			.edit({
				list: [
					{
						line: dialog.line_start,
						type: 'change',
						text_raw: text,
						start: start.value,
						end: end.value,
					},
				],
			})
			.then(() => close())
			.catch((err) => {
				console.error(`failed to save ${dialog.line_start}:`, err)
			})
	}
	return (
		<div className="modal-dialog-container">
			<div>
				<TimeEdit label="Start" time={start} />
				<TimeEdit label="End" time={end} />
				<fieldset>
					<label>Dialog</label>
					<textarea
						defaultValue={dialog.text_raw}
						onInput={(ev) => (text = ev.currentTarget.value)}
					></textarea>
				</fieldset>
				<div className="toolbar">
					<button onClick={close}>Cancel</button>
					<button onClick={save}>Save</button>
				</div>
			</div>
		</div>
	)
}

export default SubtitleEditDialog

const TimeEdit = (props: { label: string; time: { value: number } }) => {
	const value = props.time.value || 0
	let h = Math.floor(value / 3600)
	let m = Math.floor((value % 3600) / 60)
	let s = Math.floor(value % 60)
	let ms = Math.floor((value % 1) * 1000)

	const update_fn = (callback: (value: number) => void) => {
		return (el: React.FormEvent<HTMLInputElement>) => {
			const value = parseInt(el.currentTarget.value, 10)
			callback(value)
			props.time.value = h * 3600 + m * 60 + s + ms / 1000
		}
	}

	const update_h = update_fn((value) => (h = value))
	const update_m = update_fn((value) => (m = value))
	const update_s = update_fn((value) => (s = value))
	const update_ms = update_fn((value) => (ms = value))

	return (
		<fieldset className="time-edit">
			<legend>{props.label}</legend>
			<input type="number" min={0} defaultValue={h} onInput={update_h} />
			<label>h</label>
			<input type="number" min={0} max={59} defaultValue={m} onInput={update_m} />
			<label>m</label>
			<input type="number" min={0} max={59} defaultValue={s} onInput={update_s} />
			<label>s</label>
			<input type="number" min={0} max={999} defaultValue={ms} onInput={update_ms} />
			<label>ms</label>
		</fieldset>
	)
}
