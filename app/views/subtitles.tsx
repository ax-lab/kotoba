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

const Dialog = ({ entry }: { entry: SubtitleDialog }) => <div>{Japanese(entry.text)}</div>

export default SubtitleView
