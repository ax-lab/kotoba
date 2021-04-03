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

/*============================================================================*
 * Server events
 *============================================================================*/

export type EventVideoPlayback = {
	type: 'video-playback'
	play: PlaybackInfo | null
}
