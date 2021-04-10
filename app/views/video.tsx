import React, { useEffect, useState } from 'react'

import { Dir, DirEntry } from '../../lib/entities'
import { events, subtitle, video } from '../api'
import Splitter from '../components/splitter'
import State from '../util/state'

import Player from './player'
import SubtitleView from './subtitles'

import './video.scss'

const Video = () => {
	const [subs, set_subs] = useState(!!events.current_subtitle?.open)
	const [loading_sub, set_loading_sub] = useState(false)

	useEffect(() => {
		const cleanup = events.watch_subtitle('video', (ev) => {
			set_subs(ev.open)
			set_loading_sub(false)
		})
		return () => cleanup()
	}, [])

	const [playback, set_playback] = useState(events.current_playback)
	useEffect(() => {
		const cleanup = events.watch_playback('video', set_playback)
		return () => cleanup()
	}, [])

	const show_subs = subs && !loading_sub
	const load_subs = () => set_loading_sub(true)

	const cancel_load = loading_sub ? () => set_loading_sub(false) : undefined

	return (
		<div className="video-view">
			<div className="video-view-main">
				<FilesView type="video" />
				<Splitter name="video-view-splitter" />
				<div className="video-view-subtitle">
					<SubtitleView on_load={load_subs} editable={!!playback?.play?.file_name} hidden={!show_subs} />
					<FilesView type="subtitle" cancel={cancel_load} hidden={show_subs} />
				</div>
			</div>
			<Player />
		</div>
	)
}

export default Video

/*============================================================================*
 * File listing
 *============================================================================*/

type FilesViewProps = {
	type: 'video' | 'subtitle'
	cancel?: () => void
	hidden?: boolean
}

type FilesViewState = {
	message?: string
	root?: Dir
	view?: Dir
}

type OpenMap = { [key: string]: boolean }

const entryKey = (entry: DirEntry) => `${entry.path}/${entry.name}`

const FilesView = ({ type, cancel, hidden }: FilesViewProps) => {
	const openKey = `${type}-files-open`
	const [view_state, do_set_view_state] = useState({ message: 'Loading...' } as FilesViewState)
	const [open_map, do_set_open_map] = useState(State.get(openKey, {} as OpenMap))

	let unmounted = false
	useEffect(() => {
		return () => {
			unmounted = true
		}
	}, [])

	const set_open_map = (data: OpenMap) => {
		State.set(openKey, data)
		do_set_open_map(data)
	}

	const set_open = (key: string, open: boolean) => {
		set_open_map({ ...open_map, [key]: open })
	}

	const set_view_state = (state: FilesViewState) => {
		!unmounted && do_set_view_state(state)
	}

	const collapse_all = () => set_open_map({})

	function expand_dir(out: OpenMap, dir: Dir) {
		dir.list.forEach((x) => {
			if (x.type == 'dir') {
				out[entryKey(x)] = true
				expand_dir(out, x)
			}
		})
		return out
	}

	const expand_all = () => {
		if (view_state.root) {
			set_open_map(expand_dir({}, view_state.root))
		}
	}

	const refresh = () => {
		const to = setTimeout(() => set_view_state({ ...view_state, message: 'Loading...' }), 500)
		;(type == 'video' ? video.fetch_files() : subtitle.fetch_files())
			.then((root) => {
				set_view_state({ ...view_state, root, message: '' })
			})
			.catch((err) => {
				set_view_state({ ...view_state, message: 'Load failed' })
				console.error(`Loading ${type} files:`, err)
			})
			.finally(() => clearTimeout(to))
	}

	const txtFilter = React.createRef<HTMLInputElement>()

	function filterDir(words: string[], dir: Dir): Dir {
		const out = { ...dir }
		out.list = dir.list
			.map((it) => {
				if (it.type == 'dir') {
					return filterDir(words, it)
				} else {
					return it
				}
			})
			.filter((it) => {
				if (it.type == 'dir') {
					return it.list.length
				}

				const name = it.name.toLowerCase()
				for (const w of words) {
					const negate = w.startsWith('-')
					if (negate) {
						if (w.length > 1 && name.indexOf(w.slice(1)) >= 0) {
							return false
						}
					} else if (name.indexOf(w) < 0) {
						return false
					}
				}
				return true
			})
		return out
	}

	const filter = () => {
		const txt = txtFilter.current && txtFilter.current.value
		const words = txt && txt.length > 2 && txt.split(/\s+/).map((x) => x.toLowerCase())
		if (view_state.root && words && words.length) {
			const view = filterDir(words, view_state.root)
			set_view_state({ ...view_state, view: view, message: view.list.length ? '' : 'No results' })
			set_open_map(expand_dir({}, view))
		} else {
			set_view_state({ ...view_state, view: undefined, message: '' })
		}
	}

	useEffect(() => {
		refresh()
	}, [])
	return (
		<div className="video-files-view" style={{ display: hidden ? 'none' : undefined }}>
			<div className="video-toolbar">
				<button className="fas fa-sync" title="Refresh" onClick={refresh} />
				<button className="fas fa-minus-square" title="Collapse all" onClick={collapse_all} />
				<button className="fas fa-plus-square" title="Expand all" onClick={expand_all} />
				{cancel && (
					<>
						&nbsp;
						<button className="fas fa-ban" title="Cancel" onClick={cancel} />
					</>
				)}
				<input ref={txtFilter} type="search" placeholder="Filter..." spellCheck={false} onInput={filter} />
			</div>
			<div className="video-files">
				{view_state.message && <div>{view_state.message}</div>}
				{view_state.root && (
					<FileList root={view_state.view || view_state.root} open openMap={open_map} setOpen={set_open} />
				)}
			</div>
		</div>
	)
}

/** Displays an icon according to the entry type. */
const FileIcon = ({ type, open }: { type: 'dir' | 'video' | 'subtitle'; open?: boolean }) => {
	switch (type) {
		case 'dir':
			return <i className={`far fa-folder${open ? '-open' : ''}`} />
		case 'video':
			return <i className="far fa-file-video" />
		case 'subtitle':
			return <i className="far fa-file-alt" />
		default:
			return <i className="far fa-file" />
	}
}

type FileEntryProps = {
	key: string
	entry: DirEntry
	openMap: OpenMap
	setOpen: (key: string, open: boolean) => void
}

/** Renders a single DirEntry in the file listing, including child items. */
const FileEntry = ({ entry, openMap, setOpen }: FileEntryProps) => {
	const path = `${entry.path}/${entry.name}`
	const onClick = (ev: React.MouseEvent<HTMLLIElement>) => {
		if (entry.type == 'dir') {
			setOpen(path, !openMap[path])
		} else if (entry.type == 'video') {
			video.open({ filename: path }).catch((err) => console.error(err))
		} else if (entry.type == 'subtitle') {
			subtitle.load({ filename: path }).catch((err) => console.error(err))
		}
		ev.stopPropagation()
	}
	const isOpen = entry.type == 'dir' && openMap[path]
	return (
		<>
			<li onClick={(ev) => onClick(ev)} title={entry.name} className={isOpen ? 'open' : ''}>
				<FileIcon type={entry.type} open={isOpen} />
				{entry.name}
				{entry.type == 'dir' && <FileList root={entry} open={isOpen} openMap={openMap} setOpen={setOpen} />}
			</li>
		</>
	)
}

type FileListProps = {
	root: Dir
	open?: boolean
	openMap: OpenMap
	setOpen: (key: string, open: boolean) => void
}

/** Renders the children elements of a Dir entry. */
const FileList = ({ root, open, openMap, setOpen }: FileListProps) => (
	<ul className="video-file-list" style={{ display: open ? '' : 'none' }}>
		{root.list.map((it) => (
			<FileEntry key={`${it.path}/${it.name}`} entry={it} openMap={openMap} setOpen={setOpen} />
		))}
	</ul>
)
