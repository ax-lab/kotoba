import React from 'react'
import { Switch } from 'react-router'
import { NavLink, Route, BrowserRouter as Router } from 'react-router-dom'

import Dict from './views/dict'
import Home from './views/home'
import Remote from './views/remote'
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
						<NavLink to="/dict" activeClassName="active">
							Words
						</NavLink>
					</li>
					<li>
						<NavLink to="/video" activeClassName="active">
							Video
						</NavLink>
					</li>
					<li>
						<NavLink to="/remote" activeClassName="active">
							Remote
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
				<Route path="/dict/:expr*">
					<Dict />
				</Route>
				<Route path="/remote">
					<Remote />
				</Route>
			</Switch>
		</>
	</Router>
)

export default App
