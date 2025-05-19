const
	path = require('path'),
	HtmlWebpackPlugin = require('html-webpack-plugin'),
	MiniCssExtractPlugin = require('mini-css-extract-plugin'),
	CopyPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';
const buildFilename = isProduction ? 'map.html' : 'index.html';

const plugins = [
	new HtmlWebpackPlugin({
		filename: buildFilename,
		template: './src/index.ejs',
	}),

	new MiniCssExtractPlugin()
];

if (!isProduction) {
	plugins.push( new CopyPlugin({
		patterns: [
			{ from: 'src/site-globals.css', to: 'site-globals.css' }
		]
	}) )
}


module.exports = {

	mode: process.env.NODE_ENV,

	entry: './src/index.ts',

	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},

	output: {
		path: path.resolve(__dirname, 'dist'),
	},

	devtool: isProduction ? false : 'source-map',

	plugins,

	module: {
		rules: [

			{
				test: /\.ts$/i,
				use: [

					'ts-loader',

				],
			},

			{
				test: /\.css$/i,
				use: [

					MiniCssExtractPlugin.loader,

					'css-loader',

				],
			},

			{
				test: /\.ejs$/i,
				use: [

					{
						loader: 'html-loader',
						options: {
							sources: {
								urlFilter: ( a, v, p ) => {
									if (/\.css/i.test( v )) return false;
									else return true;
								}
							}
						}
					},

					'template-ejs-loader'

				]
			},

			{
				test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
				type: 'asset',
			},

			{
				test: /\.svg$/i,
				type: 'asset/source',
			},

		],
	},

};
