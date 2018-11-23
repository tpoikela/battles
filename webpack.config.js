
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const config = {
    entry: ['./client/jsx/app.tsx'],

    mode: 'development',

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build')
    },

    devtool: 'source-map',

    devServer: {
        hot: true,
        // inline: true,
        port: 3030,
        contentBase: path.join(__dirname, 'build'),
        watchContentBase: true
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },

    module: {
        rules: [
            {
                test: /\.worker\.(js|ts)$/,
                loader: 'worker-loader',
                options: {
                    publicPath: path.resolve(__dirname, 'build')
                    // name: 'create-game-worker.js'
                }
            },
            {test: /\.json$/, loader: 'json-loader',
                type: 'javascript/auto'
            },
            {test: /\.tsx?$/, loader: 'awesome-typescript-loader'},
            {enforce: 'pre', test: /.js$/, loader: 'source-map-loader'},
            {test: /\.scss$/,
                loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
            },
            {test: /\.pegjs$/, use: 'raw-loader'},
            {test: /\.md$/, use: [
                {loader: 'html-loader'},
                {loader: 'markdown-loader'}
            ]}
        ]
    },

    plugins: [
        new ExtractTextPlugin({
            allChunks: true,
            filename: 'style.css'
        })
    ],

    externals: {
        react: 'React',
        'react-dom': 'ReactDOM'
    },

    node: {
        fs: 'empty'
    }
};

module.exports = config;
