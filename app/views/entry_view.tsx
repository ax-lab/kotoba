import React from 'react'

import { Entry, EntryMatchMode, EntrySense, Tag } from '../api/client_dict'

import './entry_view.scss'

interface EntryViewProps {
	entry: Entry
}

const MatchMode = (mode: EntryMatchMode) => {
	switch (mode) {
		case 'exact':
			return '★'
		case 'prefix':
			return '⮞'
		case 'suffix':
			return '⮜'
		case 'contains':
			return '⮟'
		case 'approx':
			return '☆'
		case 'approx-prefix':
			return '⮚'
		case 'approx-suffix':
			return '⮘'
		case 'approx-contains':
			return '⮛'
		case 'fuzzy':
			return '❋'
		case 'fuzzy-prefix':
			return '↝'
		case 'fuzzy-suffix':
			return '↜'
		case 'fuzzy-contains':
			return '↯'
	}
}

const Tag = (tag: Tag) => {
	return (
		<label className="tag" title={tag.text} key={tag.name} onClick={() => alert(tag.text)}>
			{tag.name}
		</label>
	)
}

const EntryViewSense = ({ sense }: { sense: EntrySense }) => {
	const stag = [...sense.stag_kanji, ...sense.stag_reading]
	return (
		<p>
			{sense.pos.map(Tag)}
			{sense.misc.map(Tag)}
			{sense.field.map(Tag)}
			{sense.dialect.map(Tag)}
			{stag.map((it, n) => (
				<label key={n} className="entry-sense-stag">
					{it}
				</label>
			))}
			{sense.glossary.map((it, n) => (
				<span key={n} className="entry-sense-glossary">
					{it.text}
					{it.type && (
						<>
							&nbsp;<label className="entry-sense-extra-info">{it.type.slice(0, 3)}</label>
						</>
					)}
				</span>
			))}
			{sense.info.map((it, n) => (
				<span key={n} className="entry-sense-glossary">
					{it}&nbsp;<label className="entry-sense-extra-info">inf</label>
				</span>
			))}

			{sense.xref.map((it, n) => (
				<label className="entry-sense-link" key={n}>
					see: {it}
				</label>
			))}

			{sense.antonym.map((it, n) => (
				<label className="entry-sense-link" key={n}>
					ant: {it}
				</label>
			))}
		</p>
	)
}

const EntryView = ({ entry }: EntryViewProps) => {
	const words = [...entry.kanji, ...entry.reading]
	const p1 = words.filter((x) => x.popular)
	const p2 = words.filter((x) => !x.popular)

	const pri = p1.length ? p1 : p2
	const sec = p1.length ? p2 : []

	const frequency = Math.round(entry.frequency || 0)

	// additional tags for the entry
	const extra = [
		entry.popular ? 'popular' : '',
		entry.jlpt ? `jlpt${entry.jlpt}` : '',
		frequency ? `freq: ${frequency}` : ``,
		`rank: ${entry.position.toString().padStart(2, '0')}`,
	].filter((x) => x)

	return (
		<div className="entry-view">
			{entry.match_mode && <span className="entry-match-icon">{MatchMode(entry.match_mode)} </span>}
			{pri.map((item) => (
				<h1 key={item.expr}>
					<span lang="jp">{item.expr}</span>
					{item.info.map(Tag)}
				</h1>
			))}

			{extra.map((it) => (
				<label key={it} className="entry-view-extra">
					{it}
				</label>
			))}

			{sec.map((item) => (
				<h2 key={item.expr}>
					{item.info.map(Tag)}
					<span lang="jp">{item.expr}</span>
				</h2>
			))}

			{entry.sense.map((sense, n) => (
				<EntryViewSense sense={sense} key={n} />
			))}
		</div>
	)
}

export default EntryView