import React from 'react'
import { Switch } from 'react-router'
import { NavLink, Route, BrowserRouter as Router } from 'react-router-dom'

import Demo from './views/demo'
import Home from './views/home'
import Video from './views/video'

const App = () => (
	<Router>
		<>
			<nav>
				<ul>
					<li>
						<NavLink to="/" activeClassName="active" exact>
							Home
						</NavLink>
					</li>
					<li>
						<NavLink to="/video" activeClassName="active">
							Video
						</NavLink>
					</li>
					<li>
						<NavLink to="/demo" activeClassName="active">
							Demo
						</NavLink>
					</li>
				</ul>
			</nav>
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
