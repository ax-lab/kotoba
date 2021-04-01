import React from 'react'
import { Switch } from 'react-router'
import { Link, Route, BrowserRouter as Router } from 'react-router-dom'

import Demo from './components/demo'
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
					<li>
						<Link to="/demo">Demo</Link>
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
				<Route path="/demo">
					<Demo />
				</Route>
			</Switch>
		</>
	</Router>
)

export default App
