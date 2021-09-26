/**
 * @file Shared entity definitions between the front-end and backend.
 */

import { SubtitleDialog, SubtitleEdit } from './subtitles'

/*============================================================================*
 * Media API
 *============================================================================*/

/**
 * Parameters to the `video/loop` endpoint.
 */
export type VideoLoopParams = {
	save?: boolean
	a?: number
	b?: number
}

/**
 * Parameters to the `video/seek` endpoint.
 */
export type VideoSeekParams = {
	position: number
	relative?: boolean
}

/**
 * Parameters to the `subtitle/edit` endpoint.
 */
export type SubtitleEditParams = {
	list: SubtitleEdit[]
}

/**
 * Saved state for a particular media file.
 */
export type MediaSavedState = {
	/** Saved AB loop start time. */
	loop_a?: number

	/** Saved AB loop end time. */
	loop_b?: number

	/** Subtitle to load when the media is loaded. */
	subtitle?: string
}

/**
 * Media file associated with a subtitle.
 */
export type SavedSubtitleMedia = {
	media_path?: string
}

/**
 * Playback info for the current media file.
 */
export type PlaybackInfo = {
	media_path?: string // Media path as visible in the public API
	file_name?: string // File name without path
	file_path?: string // File system path for the file
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
 * Subtitle API
 *============================================================================*/

/**
 * Parameters to the `subtitle/load` endpoint
 */
export type SubtitleLoadParams = {
	filename?: string
}

/*============================================================================*
 * Server events
 *============================================================================*/

export type ServerEvent = EventVideoPlayback | EventMediaHistory | EventSubtitleChange | EventRemoteInput

/**
 * Interface for a generic event.
 */
export interface BaseEvent {
	/** Type for this event. */
	type: string
	[key: string]: unknown
}

/**
 * Video playback state update.
 */
export interface EventVideoPlayback extends BaseEvent {
	type: 'video-playback'
	play?: PlaybackInfo
	data?: MediaSavedState
}

/**
 * Change to the media history.
 */
export interface EventMediaHistory extends BaseEvent {
	type: 'media-history'
	mode: 'add' | 'del'
	data: MediaHistoryEntry[]
}

/**
 * Subtitle has been opened or closed.
 */
export interface EventSubtitleChange extends BaseEvent {
	type: 'subtitle-change'
	open: boolean
	data?: SubtitleDialog[]
	file?: string
	text?: string
}

export interface EventRemoteInput extends BaseEvent {
	type: 'remote-input'
	input: string
	sequence: number
}
