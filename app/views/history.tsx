import React from 'react'

import { events } from '../api'
import { HistoryEntry, list_history, remove_history } from '../api/client_dict'
import List from '../components/list'

import './history.scss'

const History = () => {
	const [items, set_items] = React.useState<HistoryEntry[]>([])

	const reload = () => {
		list_history()
			.then((items) => set_items(items))
			.catch((err) => console.error('Failed to load history', err))
	}

	React.useEffect(() => {
		reload()
	}, [])

	React.useEffect(() => {
		return events.watch_history_change('history', () => {
			reload()
		})
	}, [])

	return (
		<div className="history-view">
			{items.length ? (
				<List
					count={items.length}
					item={(n) => {
						const item = items[n]
						return (
							<div className="history-entry" key={item.id} title={format_date(item.date)}>
								<button
									className="fas fa-trash-alt"
									onClick={() => {
										void remove_history(item.id)
									}}
								></button>
								<p lang="jp">{item.text}</p>
							</div>
						)
					}}
				/>
			) : (
				<div>No items in history</div>
			)}
		</div>
	)

	function format_date(date: Date) {
		const pad = (n: number) => n.toString().padStart(2, '0')
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
			date.getMinutes(),
		)}`
	}
}

export default History
