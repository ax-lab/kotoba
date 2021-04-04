/**
 * @file Shared entity definitions between the front-end and backend.
 */

/*============================================================================*
 * Media API
 *============================================================================*/

/**
 * Playback info for the current media file.
 */
export type PlaybackInfo = {
	file_name?: string
	file_path?: string
	file_size?: number
	title?: string
	paused?: boolean
	position?: number
	duration?: number
	subtitle?: Subtitle
	loop_a?: number
	loop_b?: number
}

/** A single subtitle line. */
export type Subtitle = {
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
	play: PlaybackInfo | undefined
}

export interface EventMediaHistory extends BaseEvent {
	type: 'media-history'
	mode: 'add' | 'del' | 'clear'
	data: MediaHistoryEntry[]
}

export type ServerEvent = EventVideoPlayback | EventMediaHistory
