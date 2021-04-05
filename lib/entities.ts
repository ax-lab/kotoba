/**
 * @file Shared entity definitions between the front-end and backend.
 */

/*============================================================================*
 * Media API
 *============================================================================*/

/**
 * Arguments to the `video/loop` endpoint.
 */
export type VideoLoopParams = {
	save?: boolean
	a?: number
	b?: number
}

/**
 * Saved state for a particular media file.
 */
export type MediaSavedState = {
	/** Saved AB loop start time. */
	loop_a?: number

	/** Saved AB loop end time. */
	loop_b?: number
}

/**
 * Playback info for the current media file.
 */
export type PlaybackInfo = {
	file_name?: string
	file_path?: string
	file_size?: number
	title?: string
	chapter?: string
	paused?: boolean
	position?: number
	duration?: number
	subtitle?: SubtitleLine
	loop_a?: number
	loop_b?: number
}

/** A single subtitle line. */
export type SubtitleLine = {
	text: string
	start: number
	end: number
}

/**
 * Directory entry for the media file API.
 */
export type DirEntry = File | Dir

/**
 * Represents a non-directory entry from the media file API.
 */
export type File = {
	type: 'video' | 'subtitle'
	name: string
	path: string
}

/**
 * Represents a directory entry from the media file API.
 */
export type Dir = {
	type: 'dir'
	name: string
	path: string
	list: DirEntry[]
}

/**
 * One entry in the media history.
 */
export type MediaHistoryEntry = {
	id: string
	file: string
	type: 'video' | 'subtitle'
	date: string
}

/*============================================================================*
 * Server events
 *============================================================================*/

/**
 * Interface for a generic event.
 */
export interface BaseEvent {
	/** Type for this event. */
	type: string
	[key: string]: unknown
}

export interface EventVideoPlayback extends BaseEvent {
	type: 'video-playback'
	play?: PlaybackInfo
	data?: MediaSavedState
}

export interface EventMediaHistory extends BaseEvent {
	type: 'media-history'
	mode: 'add' | 'del' | 'clear'
	data: MediaHistoryEntry[]
}

export type ServerEvent = EventVideoPlayback | EventMediaHistory
