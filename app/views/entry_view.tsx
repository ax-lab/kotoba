import React from 'react'

import { kana } from '../../lib'
import { Entry, EntrySense, Tag } from '../api/client_dict'

import './entry_view.scss'

interface EntryViewProps {
	entry: Entry
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

const EntryLabel = (entry: Entry, text: string) => {
	const match = entry.match
	if (!match || !match.segments) {
		return text
	}

	const hiragana = kana.to_hiragana(text)
	if (hiragana != match.text) {
		return text
	}

	let key = 0
	const h = (s: string) => (
		<span className="highlight-match" key={key++}>
			{s}
		</span>
	)

	if (hiragana.length != text.length) {
		// this should not happen, but in case the hiragana conversion
		// does not match the text we just highlight the entire entry
		return h(text)
	}

	const sequence: Array<string | JSX.Element> = []

	let position = 0
	let highlight = ''
	for (const chr of match.segments) {
		const next = hiragana.indexOf(chr, position)
		if (next < 0) {
			break
		} else if (next > position) {
			if (highlight) {
				sequence.push(h(highlight))
				highlight = ''
			}
			sequence.push(text.slice(position, next))
		}
		highlight += text.slice(next, next + chr.length)
		position = next + chr.length
	}

	if (highlight) {
		sequence.push(h(highlight))
	}
	if (position < text.length) {
		sequence.push(text.slice(position))
	}

	return sequence
}

const EntryView = ({ entry }: EntryViewProps) => {
	const words = [...entry.kanji, ...entry.reading]
	const p1 = words.filter((x) => x.popular)
	const p2 = words.filter((x) => !x.popular)

	const pri = p1.length ? p1 : p2
	const sec = p1.length ? p2 : []

	const frequency = Math.round(entry.frequency || 0)

	// additional tags for the entry

	// Important information about the whole entry. This is shown highlighted
	// right after the term kanji/readings.
	const inflect_label = entry.match?.inflected_suffix ? (
		<span lang="jp" key="lbl">
			{entry.match?.inflected_suffix}：
		</span>
	) : (
		<></>
	)
	const extra_info = [
		// is the entry popular
		entry.popular ? 'popular' : '',
		// match mode
		entry.match?.mode && !/^(exact|deinflect)$/.test(entry.match.mode) ? `${entry.match.mode}` : ``,
		// inflections
		entry.match?.inflection_rules?.length ? [inflect_label, entry.match.inflection_rules.join(' + ')] : ``,
	].filter((x) => !!x)

	// Extra information about the entry. This is shown after `extra_info` and
	// not highlighted.
	const extra = [
		entry.jlpt ? `jlpt${entry.jlpt}` : '',
		frequency ? `freq: ${frequency}` : ``,
		`rank: ${entry.position.toString().padStart(2, '0')}`,
	].filter((x) => x)

	return (
		<div className="entry-view">
			{pri.map((item) => (
				<h1 key={item.expr}>
					<span lang="jp">{EntryLabel(entry, item.expr)}</span>
					{item.info.map(Tag)}
				</h1>
			))}

			{extra_info.map((it, n) => (
				<label key={n} className="entry-view-extra highlight">
					{it}
				</label>
			))}

			{extra.map((it) => (
				<label key={it} className="entry-view-extra">
					{it}
				</label>
			))}

			{sec.map((item) => (
				<h2 key={item.expr}>
					{item.info.map(Tag)}
					<span lang="jp">{EntryLabel(entry, item.expr)}</span>
				</h2>
			))}

			{entry.sense.map((sense, n) => (
				<EntryViewSense sense={sense} key={n} />
			))}
		</div>
	)
}

export default EntryView
