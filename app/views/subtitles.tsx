import React, { useEffect, useState } from 'react'

import { EventSubtitleChange } from '../../lib'
import { SubtitleDialog } from '../../lib/subtitles'
import { events } from '../api'
import Japanese from '../util/japanese'

import './subtitles.scss'

let current_subtitle: EventSubtitleChange | undefined

events.register((ev) => {
	if (ev.type == 'subtitle-change') {
		current_subtitle = ev
	}
})

const SubtitleView = () => {
	const [subtitle, set_subtitle] = useState(current_subtitle)

	useEffect(() => {
		const unregister = events.register((ev) => {
			if (ev.type == 'subtitle-change') {
				set_subtitle(ev)
			}
		})
		return () => unregister()
	}, [])

	return (
		<div className="subtitle-view">
			{subtitle?.data?.map((dialog) => (
				<Dialog key={dialog.line_start} entry={dialog} />
			))}
		</div>
	)
}

const Dialog = ({ entry }: { entry: SubtitleDialog }) => {
	const [popup, set_popup] = useState(false)
	const popup_el = React.createRef<HTMLDivElement>()
	useEffect(() => {
		const fn = () => {
			set_popup(false)
		}
		document.addEventListener('click', fn)
		return () => {
			document.removeEventListener('click', fn)
		}
	})

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

	return (
		<div className="subtitle-entry">
			<div className="time-label">
				<TimeLabel time={entry.start.time} />
				<TimeLabel time={entry.end.time} />
			</div>
			<div className="subtitle-text">{Japanese(entry.text)}</div>
			<div className="subtitle-toolbar">
				<button className="far fa-clipboard" title="Copy to Clipboard" onClick={copy} />
				<button className="fas fa-sync-alt" title="Loop Dialog" />
				<button
					className="fas fa-bars"
					onClick={(ev) => {
						const btn = (ev.target as Element).getBoundingClientRect()
						const el = popup_el.current
						if (el) {
							const size = el.getBoundingClientRect()
							const style = window.getComputedStyle(el)
							const padR = parseFloat(style.paddingRight)
							const padT = parseFloat(style.paddingTop)
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
				<div ref={popup_el} className="popup" style={{ visibility: popup ? 'visible' : 'hidden' }}>
					<button className="fas fa-globe" title="Translate" onClick={translate} />
					<span className="separator" />
					<button className="fas fa-step-forward" title="Set Loop B" />
					<button className="fas fa-step-backward" title="Set Loop A" />
					<span className="separator" />
					<button
						className="far fa-hourglass"
						title="Sync All&#013;Syncs subtitle and apply delta to all subtitles"
					/>
					<button
						className="fas fa-hourglass-end"
						title="Sync Forward&#013;Syncs subtitle and apply delta to all subtitles going forward"
					/>
					<button
						className="fas fa-stopwatch"
						title="Sync Current&#013;Syncs subtitle to start at current playback position"
					/>
					<button
						className="far fa-clock"
						title="Sync Duration&#013;Changes subtitle duration to end at current playback position"
					/>
					<span className="separator" />
					<button className="far fa-edit" title="Edit" />
					<button className="far fa-trash-alt" title="Delete" />
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
