/**
 * @file Shared entity definitions between the front-end and backend.
 */

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
