import React, { useEffect, useState } from 'react'

import { Dir, DirEntry } from '../../lib/video_types'
import { video } from '../api'

type FileEntryProps = {
	entry: DirEntry
}

const FileEntry = ({ entry }: FileEntryProps) => (
	<>
		<li>
			{entry.name}
			{entry.type == 'dir' && <FileList root={entry} />}
		</li>
	</>
)

type FileListProps = {
	root: Dir
}

const FileList = ({ root }: FileListProps) => (
	<ul>
		{root.list.map((it) => (
			<FileEntry entry={it} />
		))}
	</ul>
)

type VideoState = {
	message?: string
	root?: Dir
}

const Video = () => {
	const [state, setState] = useState({ message: 'Loading...' } as VideoState)
	useEffect(() => {
		video
			.fetch_files()
			.then((root) => {
				setState({ ...state, root, message: '' })
			})
			.catch((err) => {
				setState({ ...state, message: 'Load failed' })
				console.error('Loading video files:', err)
			})
	}, [])
	return (
		<>
			<h2>Video</h2>
			<hr />
			{state.message && <div>{state.message}</div>}
			{state.root && <FileList root={state.root} />}
		</>
	)
}

export default Video
