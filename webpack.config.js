const path = require('path')

const CopyPlugin = require('copy-webpack-plugin')

const OUTPUT = path.resolve(__dirname, 'build', 'app')

const common = {
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: 'ts-loader',
					options: {
						transpileOnly: true,
					},
				},
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.s[ac]ss$/i,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: 'asset/resource',
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	devtool: 'inline-source-map',
	optimization: {
		usedExports: false,
	},
	performance: {
		maxEntrypointSize: 2 * 1024 * 1024,
		maxAssetSize: 2 * 1024 * 1024,
	},
}

module.exports = (env, _args) => {
	const { devServer = false } = env || {}

	// Note: dev-server doesn't preserve module exports
	//
	// https://github.com/webpack/webpack-dev-server/issues/2484
	//
	// To get around that we add `injectClient: false` to the options, but to
	// preserve live reloading we use the `devServer` env trick below (to run
	// this use `npx webpack serve --env devServer`).

	const appIndex = './app/index.tsx'
	const frontend = {
		entry: devServer ? ['webpack-dev-server/client', appIndex] : appIndex,
		output: {
			filename: 'app.js',
			path: OUTPUT,
			publicPath: '/',
		},
		plugins: [
			new CopyPlugin({
				patterns: [{ context: 'public', from: '**/*', to: OUTPUT }],
			}),
		],
		devServer: {
			host: '0.0.0.0',
			static: {
				directory: 'public',
				serveIndex: true,
				watch: true,
			},
			port: 9090,
			client: false,
			proxy: {
				'/api': {
					target: 'http://localhost:8086',
				},
				'/graphql': {
					target: 'http://localhost:8086',
				},
			},
			historyApiFallback: {
				index: '/index.html',
			},
		},
	}

	return Object.assign({}, common, frontend)
}
