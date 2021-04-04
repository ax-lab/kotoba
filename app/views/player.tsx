import React, { useEffect, useState } from 'react'

import './player.scss'

import { PlaybackInfo } from '../../lib'
import { events, video } from '../api'

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

function timer(time?: number) {
	if (time == null) {
		return ['--:--', '']
	}
	const p = (s: number) => s.toString().padStart(2, '0')

	const s = Math.floor(time % 60)
	const m = Math.floor((time % 3600) / 60)
	const h = Math.floor(time / 3600)

	const frac = Math.floor((time % 1) * 100)

	const t = [p(m), p(s)]
	if (h > 0) {
		t.unshift(p(h))
	}
	return [t.join(':'), p(frac)]
}

/**
 * Provides a self-synchronizing media player UI. This will listen to events
 * from the server and reflect the current playback state.
 */
const Player = () => {
	const [player, setPlayer] = useState<PlayerState>({
		play: currentPlayback,
	})

	const [showCC, setShowCC] = useState(true)

	const play = player.play
	const title_text = play && (play.title || play.file_name || '')
	const title_hint = (() => {
		const { file_path, file_size } = play || {}
		if (file_path) {
			return file_size ? `${file_path} (${bytes(file_size)})` : file_path
		}
		return ''
	})()
	const is_open = play && !!title_hint

	const [pos, pos_ms] = timer(play && (play.position || 0))
	const [duration] = timer(play && play.duration)

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
			{is_open && (
				<>
					<div className="timer">
						<label>
							{pos}
							{pos_ms && <small>{pos_ms}</small>}
						</label>
						<label>🢒 {duration} 🢐</label>
					</div>
					{play!.paused ? (
						<button title="Play" className="fas fa-play-circle" onClick={() => video.play()} />
					) : (
						<button title="Pause" className="fas fa-pause-circle" onClick={() => video.pause()} />
					)}
					<button title="Stop Player" className="fas fa-stop-circle" onClick={() => video.close()} />
					{showCC ? (
						<button title="Hide CC" className="fas fa-closed-captioning" onClick={() => setShowCC(false)} />
					) : (
						<button
							title="Show CC"
							className="fas fa-closed-captioning inactive"
							onClick={() => setShowCC(true)}
						/>
					)}
					<button title="Bookmark" className="fas fa-bookmark" />
					<button title="Mark Loop A" className="fas fa-quote-left" />
					<button title="Mark Loop B" className="fas fa-quote-right" />
					{play!.loop_a && play!.loop_b ? (
						<button title="Leave Loop" className="fas fa-redo-alt" />
					) : (
						<button title="Cycle Loop" className="fas fa-sync-alt" />
					)}
				</>
			)}
			<label className="media-title" title={title_hint}>
				{title_text || 'Nothing is playing.'}
			</label>
		</div>
	)
}

export default Player
