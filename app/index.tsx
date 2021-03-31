import React from 'react'
import ReactDOM from 'react-dom'

import App from './app'

ReactDOM.render(<App />, document.getElementById('root'))

fetch('/api')
	.then((data) => data.json())
	.then((data) => {
		console.log('API:', data)
	})
	.catch((err) => console.error(err))
