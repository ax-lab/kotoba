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
	const [subtitle, setSubtitle] = useState(current_subtitle)

	useEffect(() => {
		const unregister = events.register((ev) => {
			if (ev.type == 'subtitle-change') {
				setSubtitle(ev)
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

const Dialog = ({ entry }: { entry: SubtitleDialog }) => (
	<div className="subtitle-entry">
		<div className="time-label">
			<TimeLabel time={entry.start.time} />
			<TimeLabel time={entry.end.time} />
		</div>
		<div className="subtitle-text">{Japanese(entry.text)}</div>
	</div>
)

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
