import React, { useEffect, useState } from 'react'

import { SubtitleDialog, SubtitleEdit } from '../../lib-ts/subtitles'
import { events, subtitle, video } from '../api'
import Japanese from '../util/japanese'

import './subtitles.scss'
import SubtitleEditDialog from './subtitle_edit_dialog'

type SubtitleViewProps = {
	on_load?: () => void
	editable?: boolean
	hidden?: boolean
}

const SubtitleView = (args: SubtitleViewProps) => {
	const [subs, set_subs] = useState(events.current_subtitle)

	const name = subs?.file?.split('/').pop()

	useEffect(() => {
		const cleanup = events.watch_subtitle('subtitle-view', (ev) => set_subs(ev))
		return () => cleanup()
	}, [])

	const toggle_play_keydown = (ev: KeyboardEvent) => {
		const subs = events.current_subtitle?.data || []

		const playback = events.current_playback
		const pos = events.target_playback_position || playback?.play?.position || 0

		let cur_index = -1
		for (const [index, it] of subs.entries()) {
			if (it.start.time <= pos) {
				cur_index = index
			}
		}

		let handled = false
		switch (ev.code) {
			case 'Space':
			case 'Enter':
				handled = true
				void video.toggle_play()
				break
			case 'ArrowUp':
				handled = true
				if (cur_index >= 0) {
					const cur_time = subs[cur_index].start.time
					const previous = subs
						.filter((it) => cur_time - it.end.time >= -0.01)
						.sort((a, b) => b.start.time - a.start.time)
					if (pos - cur_time > 1 || previous.length == 0) {
						void video.seek({ position: cur_time })
					} else {
						void video.seek({ position: previous[0].start.time })
					}
				}
				break

			case 'ArrowDown':
				handled = true
				{
					const next = subs
						.filter((it) => it.start.time - (pos + 0.25) > 0)
						.sort((a, b) => a.start.time - b.start.time)
					if (next.length > 0) {
						void video.seek({ position: next[0].start.time })
					}
				}
				break

			case 'ArrowLeft':
				handled = true
				void video.seek({ position: -2, relative: true })
				break

			case 'ArrowRight':
				handled = true
				void video.seek({ position: +2, relative: true })
				break
		}
		if (handled) {
			ev.preventDefault()
			ev.stopPropagation()
		}
	}

	// Monitor current playback state to select active subtitle.
	const subtitle_view = React.createRef<HTMLDivElement>()

	useEffect(() => {
		const el = subtitle_view.current!
		el.addEventListener('keydown', toggle_play_keydown)
		return () => el.removeEventListener('keydown', toggle_play_keydown)
	})

	useEffect(() => {
		const root = subtitle_view.current!
		let layout_id = requestAnimationFrame(do_layout)
		let layout_pos: number | undefined
		let layout_sub: string | undefined
		return () => {
			cancelAnimationFrame(layout_id)
		}
		// Select the active subtitle and scroll it into view
		function do_layout() {
			try {
				const subs = events.current_subtitle?.data
				const cur = events.current_playback?.play?.position
				const sub = events.current_subtitle?.file
				if (cur !== layout_pos || sub !== layout_sub || true) {
					const active = cur != null && subs?.filter((x) => x.start.time <= cur && x.end.time >= cur).shift()
					const last_active = root.querySelector('.subtitle-entry.active')
					const clear_active = () => last_active?.classList.remove('active')
					layout_pos = cur
					layout_sub = sub
					if (active) {
						const last_active = root.querySelector('.subtitle-entry.active')
						const next_active =
							active && root.querySelector(`.subtitle-entry[data-line="${active.line_start}"]`)
						if (last_active != next_active) {
							clear_active()
							if (next_active) {
								next_active.classList.add('active')
								const r = root.getBoundingClientRect()
								const n = next_active.getBoundingClientRect()
								const r1 = r.y
								const r2 = r1 + r.height
								const n1 = n.y
								const n2 = n1 + n.height
								if ((n1 >= r1 && n1 <= r2) || (n2 >= r1 && n2 <= r2) || (n1 < r1 && n2 > r1)) {
									next_active.scrollIntoView({
										behavior: 'smooth',
										block: 'center',
										inline: 'center',
									})
								}
							}
						}
					}
				}
			} finally {
				layout_id = requestAnimationFrame(do_layout)
			}
		}
	}, [])

	return (
		<div
			ref={subtitle_view}
			tabIndex={1}
			className="subtitle-view"
			onScroll={(ev) => {
				const cls = 'disable-hover'
				const el = ev.target as Element & { hover_timer?: number }
				el.classList.add(cls)
				clearTimeout(el.hover_timer)
				el.hover_timer = window.setTimeout(() => el.classList.remove(cls), 500)
			}}
			style={{ display: args.hidden ? 'none' : undefined }}
		>
			<div className="subtitle-main-toolbar">
				<label title={subs?.file}>{name}</label>
				<button
					title="Select subtitle file"
					className="fas fa-folder-open"
					onClick={() => {
						if (args.on_load) {
							args.on_load()
						}
					}}
				/>
				<button title="Undo last change" className="fas fa-undo" onClick={() => subtitle.undo()} />
				<button title="Scroll to current dialog" className="fas fa-comment-dots" />
			</div>
			{subs?.data?.map((dialog) => (
				<Dialog key={dialog.line_start} entry={dialog} editable={args.editable} />
			))}
		</div>
	)
}

const Dialog = ({ entry, editable }: { entry: SubtitleDialog; editable?: boolean }) => {
	const [popup, set_popup] = useState(false)
	const popup_el = React.createRef<HTMLDivElement>()
	useEffect(() => {
		const fn = () => {
			set_popup(false)
		}
		document.addEventListener('click', fn)

		const parent = popup_el.current?.closest('.subtitle-view')
		parent && parent.addEventListener('scroll', fn)
		return () => {
			document.removeEventListener('click', fn)
			parent && parent.removeEventListener('scroll', fn)
		}
	}, [])

	const [editing, set_editing] = useState(false)
	const edit = () => {
		if (editable) {
			set_editing(true)
		}
	}

	const cancel_edit = () => set_editing(false)

	const copy = () => {
		try {
			void navigator.clipboard.writeText(entry.text)
		} catch (e) {
			// ignore
		}
	}

	const translate = () => {
		const encoded = window.encodeURIComponent(entry.text)
		window.open(`https://www.deepl.com/translator#ja/en/${encoded}`, '_blank')
	}

	const apply_edit = (factory: (pos: number) => SubtitleEdit) => {
		const pos = events.current_playback?.play?.position
		editable &&
			pos != null &&
			subtitle.edit({
				list: [factory(pos)],
			})
	}

	return (
		<div
			className="subtitle-entry"
			data-line={entry.line_start}
			onDoubleClick={(ev) => {
				ev.preventDefault()
				ev.stopPropagation()
				void video.seek({ position: entry.start.time })
			}}
		>
			{editing && <SubtitleEditDialog dialog={entry} close={cancel_edit} />}
			<div className="time-label">
				<TimeLabel time={entry.start.time} />
				<TimeLabel time={entry.end.time} />
			</div>
			<div className="subtitle-text">{Japanese(entry.text)}</div>
			<div className="subtitle-toolbar">
				{editable ? (
					<>
						<button
							className="fas fa-play"
							title="Play"
							onClick={() => {
								void video.seek({ position: entry.start.time })
								void video.play()
							}}
						/>
						<button
							className="fas fa-sync-alt"
							title="Loop Dialog"
							onClick={() => video.loop({ a: entry.start.time, b: entry.end.time })}
						/>
						<button
							className="fas fa-bars"
							onClick={(ev) => {
								const btn = (ev.target as Element).getBoundingClientRect()
								const el = popup_el.current
								if (el) {
									const size = el.getBoundingClientRect()
									const style = window.getComputedStyle(el)
									const padR = parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth)
									const padT = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth)
									el.style.left = `${btn.x - size.width - 2 * padR}px`
									el.style.top = `${btn.y - padT}px`
									// We need a timeout here because of the global click
									// handler that dismisses the menu
									setTimeout(() => {
										set_popup(!popup)
									}, 0)
								}
							}}
						/>
					</>
				) : (
					<>
						<button className="far fa-clipboard" title="Copy to Clipboard" onClick={copy} />
						<button className="fas fa-globe" title="Translate" onClick={translate} />
					</>
				)}
				<div
					ref={popup_el}
					className="popup"
					style={{ visibility: popup ? 'visible' : 'hidden', display: !editable ? 'none' : undefined }}
				>
					<button className="far fa-clipboard" title="Copy to Clipboard" onClick={copy} />
					<button className="fas fa-globe" title="Translate" onClick={translate} />
					<span className="separator" />
					<button
						className="fas fa-quote-right"
						title="Set Loop B"
						onClick={() => video.loop({ b: entry.end.time, save: true })}
					/>
					<button
						className="fas fa-quote-left"
						title="Set Loop A"
						onClick={() => video.loop({ a: entry.start.time, save: true })}
					/>
					<span className="separator" />
					<button
						className="far fa-hourglass"
						title="Sync All&#013;Syncs subtitle and apply delta to all subtitles"
						onClick={() =>
							apply_edit((pos) => ({
								line: entry.line_start,
								type: 'start',
								mode: 'all',
								to_position: pos,
							}))
						}
					/>
					<button
						className="fas fa-hourglass-end"
						title="Sync Forward&#013;Syncs subtitle and apply delta to all subtitles going forward"
						onClick={() =>
							apply_edit((pos) => ({
								line: entry.line_start,
								type: 'start',
								mode: 'forward',
								to_position: pos,
							}))
						}
					/>
					<button
						className="fas fa-stopwatch"
						title="Sync Current&#013;Syncs subtitle to start at current playback position"
						onClick={() =>
							apply_edit((pos) => ({
								line: entry.line_start,
								type: 'start',
								mode: 'single',
								to_position: pos,
							}))
						}
					/>
					<button
						className="far fa-clock"
						title="Sync Duration&#013;Changes subtitle duration to end at current playback position"
						onClick={() =>
							apply_edit((pos) => ({
								line: entry.line_start,
								type: 'end',
								to_position: pos,
							}))
						}
					/>
					<span className="separator" />
					<button className="far fa-edit" title="Edit" onClick={edit} />
					<button
						className="far fa-trash-alt"
						title="Delete"
						onClick={() =>
							apply_edit(() => ({
								line: entry.line_start,
								type: 'delete',
							}))
						}
					/>
				</div>
			</div>
		</div>
	)
}

const TimeLabel = ({ time }: { time?: number }) => {
	if (!time) return <span />

	const pad = (v: number) => Math.floor(v).toString().padStart(2, '0')
	const h = Math.floor(time / 3600)
	const m = pad((time % 3600) / 60)
	const s = pad(time % 60)
	const hs = pad((time % 1) * 100)
	return (
		<span>
			{h}:{m}:{s}
			<small>{hs}</small>
		</span>
	)
}

export default SubtitleView
