import cls from 'classnames'
import React, { useEffect, useState } from 'react'

import './player.scss'

import { events, video } from '../api'
import Japanese from '../util/japanese'

/**
 * Provides a self-synchronizing media player UI. This will listen to events
 * from the server and reflect the current playback state.
 */
const Player = () => {
	// The player state is provided through server events, we just need to
	// listen to those events and update accordingly.
	const [playback, set_playback] = useState(events.current_playback)
	useEffect(() => {
		const cleanup = events.watch_playback(set_playback)
		return () => cleanup()
	}, [])

	// CC and AB loop state are local.
	const [show_cc, set_show_cc] = useState(true)

	const title_text = playback?.play && (playback.play.title || playback.play.file_name || '')
	const title_hint = (() => {
		const { file_path, file_size } = playback?.play || {}
		if (file_path) {
			return file_size ? `${file_path} (${bytes(file_size)})` : file_path
		}
		return ''
	})()
	const chapter = playback?.play?.chapter

	const saved_loop_a = playback?.data?.loop_a
	const saved_loop_b = playback?.data?.loop_b
	const loop_a_hint = saved_loop_a! >= 0 ? timer(saved_loop_a) : ['unset']
	const loop_b_hint = saved_loop_b! >= 0 ? timer(saved_loop_b) : ['unset']

	const can_loop = saved_loop_a! >= 0 && saved_loop_b! > saved_loop_a!

	const loop_a = playback?.play?.loop_a
	const loop_b = playback?.play?.loop_b
	const position = playback?.play?.file_name ? playback.play.position || 0 : -1
	const [pos, pos_ms] = timer(position)
	const [duration] = timer(playback?.play?.file_name && playback.play.duration)

	const subtitle = playback?.play?.subtitle?.text

	const btn = (icon: string, ...extra: string[]) => `fas fa-${icon}` + (extra ? ` ${extra.join(' ')}` : '')

	const update_loop = (a?: number, b?: number) => {
		if (a! > b!) {
			const c = a
			a = b
			b = c
		}
		void video.loop({ a, b, save: true })
		playback && set_playback({ ...playback, data: { ...playback.data, loop_a: a, loop_b: b } })
	}

	const set_loop_a = (value: number) => {
		update_loop(value, saved_loop_b)
	}
	const set_loop_b = (value: number) => {
		update_loop(saved_loop_a, value)
	}

	const player_root = React.createRef<HTMLDivElement>()
	const subs_root = React.createRef<HTMLDivElement>()

	useEffect(() => {
		const el_player = player_root.current!
		const el_subs = subs_root.current

		let next_layout: number
		next_layout = requestAnimationFrame(layout_subs)
		return () => cancelAnimationFrame(next_layout)

		function layout_subs() {
			const player = el_player.getBoundingClientRect()
			if (el_subs && player) {
				el_subs.style.bottom = `${Math.ceil(player.height) + 10}px`
			}
			next_layout = requestAnimationFrame(layout_subs)
		}
	}, [])

	return (
		<>
			<div
				ref={subs_root}
				className="video-subtitles"
				style={{ display: !(show_cc && subtitle) ? 'none' : undefined }}
			>
				{Japanese(subtitle || '')}
			</div>
			<div ref={player_root} className="video-player">
				{playback?.play?.file_name && (
					<>
						<div className="timer">
							<label>
								{pos}
								{pos_ms && <small>{pos_ms}</small>}
							</label>
							<label>🢒 {duration} 🢐</label>
						</div>
						{playback.play.paused ? (
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
							className={cls(btn('quote-left'), { inactive: saved_loop_a == null })}
							onClick={() => position >= 0 && set_loop_a(position)}
						/>
						<button
							title={`Mark Loop B (${loop_b_hint.join('.')})`}
							className={cls(btn('quote-right'), { inactive: saved_loop_b == null })}
							onClick={() => position >= 0 && set_loop_b(position)}
						/>
						{loop_a != null && loop_b != null && position >= loop_a && position <= loop_b ? (
							<button title="Leave Loop" className={btn('redo-alt')} onClick={() => video.stop_loop()} />
						) : (
							<button
								title="Cycle Loop"
								className={cls(btn('sync-alt'), { inactive: !can_loop })}
								onClick={() => can_loop && video.loop({ a: saved_loop_a, b: saved_loop_b })}
							/>
						)}
					</>
				)}
				<label className="media-title" title={title_hint}>
					<span>{title_text || 'Nothing is playing.'}</span>
					<span>{chapter ? ' - ' + chapter : ''}</span>
				</label>
			</div>
		</>
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
