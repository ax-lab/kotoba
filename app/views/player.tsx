import cls from 'classnames'
import React, { useEffect, useState } from 'react'

import './player.scss'

import { PlaybackInfo } from '../../lib'
import { events, video } from '../api'

// The Player component listens to `video-playback` events, but since those are
// asynchronous we also maintain a global listener to provide the initial value.
let current_playback: PlaybackInfo | undefined

events.register((ev) => {
	if (ev.type == 'video-playback') {
		current_playback = ev.play
	}
})

type PlayerState = {
	play?: PlaybackInfo
}

/**
 * Provides a self-synchronizing media player UI. This will listen to events
 * from the server and reflect the current playback state.
 */
const Player = () => {
	// The player state is provided through server events, we just need to
	// listen to those events and update accordingly.
	const [player, set_player] = useState<PlayerState>({
		// We use the state provided by the global listener as our initial state
		play: current_playback,
	})

	useEffect(() => {
		const unregister = events.register((ev) => {
			if (ev.type == 'video-playback') {
				set_player({ ...player, play: ev.play })
			}
		})
		return () => unregister()
	}, [])

	// CC and AB loop state are local.
	const [show_cc, set_show_cc] = useState(true)
	const [loop_a, set_loop_a] = useState(-1)
	const [loop_b, set_loop_b] = useState(-1)
	const can_loop = loop_a >= 0 && loop_b > loop_a
	const loop_a_hint = loop_a >= 0 ? timer(loop_a) : ['unset']
	const loop_b_hint = loop_b >= 0 ? timer(loop_b) : ['unset']

	const play = player.play
	const title_text = play && (play.title || play.file_name || '')
	const title_hint = (() => {
		const { file_path, file_size } = play || {}
		if (file_path) {
			return file_size ? `${file_path} (${bytes(file_size)})` : file_path
		}
		return ''
	})()
	const is_open = play && title_text

	const position = is_open ? play!.position || 0 : -1
	const [pos, pos_ms] = timer(position)
	const [duration] = timer(is_open && play!.duration)

	const btn = (icon: string, ...extra: string[]) => `fas fa-${icon}` + (extra ? ` ${extra.join(' ')}` : '')

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
						<button title="Play" className={btn('play-circle')} onClick={() => video.play()} />
					) : (
						<button title="Pause" className={btn('pause-circle')} onClick={() => video.pause()} />
					)}
					<button title="Stop Player" className={btn('stop-circle')} onClick={() => video.close()} />
					{show_cc ? (
						<button
							title="Hide CC"
							className={btn('closed-captioning')}
							onClick={() => set_show_cc(false)}
						/>
					) : (
						<button
							title="Show CC"
							className={btn('closed-captioning', 'inactive')}
							onClick={() => set_show_cc(true)}
						/>
					)}
					<button title="Bookmark" className={btn('bookmark')} />
					<button
						title={`Mark Loop A (${loop_a_hint.join('.')})`}
						className={cls(btn('quote-left'), { inactive: loop_a < 0 })}
						onClick={() => position >= 0 && set_loop_a(position)}
					/>
					<button
						title={`Mark Loop B (${loop_b_hint.join('.')})`}
						className={cls(btn('quote-right'), { inactive: loop_b < 0 })}
						onClick={() => position >= 0 && set_loop_b(position)}
					/>
					{play!.loop_a && play!.loop_b ? (
						<button title="Leave Loop" className={btn('redo-alt')} onClick={() => video.stop_loop()} />
					) : (
						<button
							title="Cycle Loop"
							className={cls(btn('sync-alt'), { inactive: !can_loop })}
							onClick={() => can_loop && video.loop({ a: loop_a, b: loop_b })}
						/>
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

function timer(time?: number | false | '') {
	if (typeof time != 'number' || time < 0) {
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
