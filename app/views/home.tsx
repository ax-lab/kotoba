import React, { useEffect } from 'react'

const Home = () => {
	useEffect(() => {
		const title = document.title
		document.title += ' - Home'
		return () => {
			document.title = title
		}
	})

	return (
		<>
			<h2>Home</h2>
		</>
	)
}

export default Home
