import React, { useEffect, useState } from 'react'

import './player.scss'

import { PlaybackInfo } from '../../lib'
import { events } from '../api'

let currentPlayback: PlaybackInfo | undefined

events.register((ev) => {
	if (ev.type == 'video-playback') {
		currentPlayback = ev.play
	}
})

type PlayerState = {
	play?: PlaybackInfo
}

function bytes(bytes: number) {
	const KB = 1024
	const MB = 1024 * KB
	const GB = 1024 * MB
	if (bytes == 1) {
		return '1 byte'
	} else if (bytes < KB) {
		return `${bytes} bytes`
	} else if (bytes < MB) {
		return `${(bytes / KB).toFixed(1)} KB`
	} else if (bytes < GB) {
		return `${(bytes / MB).toFixed(2)} MB`
	} else {
		return `${(bytes / GB).toFixed(2)} GB`
	}
}

/**
 * Provides a self-synchronizing media player UI. This will listen to events
 * from the server and reflect the current playback state.
 */
const Player = () => {
	const [player, setPlayer] = useState<PlayerState>({
		play: currentPlayback,
	})

	const title_text = player.play && (player.play.title || player.play.file_name || '')
	const title_hint = (() => {
		const { file_path, file_size } = player.play || {}
		if (file_path) {
			return file_size ? `${file_path} (${bytes(file_size)})` : file_path
		}
		return ''
	})()

	useEffect(() => {
		const unregister = events.register((ev) => {
			if (ev.type == 'video-playback') {
				setPlayer({ ...player, play: ev.play })
			}
		})
		return () => unregister()
	}, [])
	return (
		<div className="video-player">
			<label title={title_hint}>{title_text || 'Nothing is playing.'}</label>
			<button title="Play" className="fas fa-play-circle" />
			<button title="Pause" className="fas fa-pause-circle" />
			<button title="Stop Player" className="fas fa-stop-circle" />
			<button title="Hide CC" className="fas fa-closed-captioning" />
			<button title="Show CC" className="far fa-closed-captioning" />
			<button title="Mark Loop A" className="fas fa-quote-left" />
			<button title="Mark Loop B" className="fas fa-quote-right" />
			<button title="Cycle Loop" className="fas fa-sync-alt" />
			<button title="Leave Loop" className="fas fa-redo-alt" />
			<button title="Bookmark" className="fas fa-bookmark" />
		</div>
	)
}

export default Player
