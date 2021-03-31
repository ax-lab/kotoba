import React from 'react'
import { Switch } from 'react-router'
import { Link, Route, HashRouter as Router } from 'react-router-dom'

import Home from './components/home'
import Video from './components/video'

const App = () => (
	<Router>
		<>
			<h1>Kotoba</h1>
			<hr />
			<nav>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						<Link to="/video">Video</Link>
					</li>
				</ul>
			</nav>
			<hr />
			<Switch>
				<Route exact path="/">
					<Home />
				</Route>
				<Route path="/video">
					<Video />
				</Route>
			</Switch>
		</>
	</Router>
)

export default App
