export type DirEntry = File | Dir

export type File = {
	type: 'video' | 'subtitle'
	name: string
	path: string
}

export type Dir = {
	type: 'dir'
	name: string
	path: string
	list: DirEntry[]
}
