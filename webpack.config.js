
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isDevel = !isProduction;

//----------------------
// BASE SETTINGS
//----------------------
const config = {
    entry: ['./client/jsx/app.tsx'],

    mode: 'development',

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),

        // Needed for webworker to bundle correct paths
        publicPath: '/build/'
    },

    devtool: 'source-map',

    devServer: {
        hot: false,
        // inline: true,
        port: 3030,
        // index.html will be server from here
        contentBase: path.join(__dirname, './'),
        watchContentBase: true
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            'ejs': 'ejs/ejs.min.js' // Added to prevent warning
        }
    },

    module: {
        rules: [
            {
                test: /\.worker\.(js|ts)$/,
                loader: 'worker-loader',
                options: {
                    publicPath: path.resolve(__dirname, 'build')
                }
            },
            {test: /\.json$/, loader: 'json-loader',
                type: 'javascript/auto'
            },
            {
                test: /\.tsx?$/, loader: 'awesome-typescript-loader',
                include: [
                    path.resolve(__dirname, 'client'),
                    path.resolve(__dirname, 'lib'),
                    path.resolve(__dirname, 'tests/helpers'),
                ],
                /*options: {
                    useCache: isDevel,
                    forceIsolatedModules: isDevel
                }*/
            },
            {enforce: 'pre', test: /.js$/, loader: 'source-map-loader'},
            {test: /\.scss$/,
                loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
            },
            // {test: /\.pegjs$/, use: 'raw-loader'},
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

//----------------------
// PRODUCTION SETTINGS
//----------------------
if (isProduction) {
    config.mode = 'production';
    delete config.devtool;
}
else {
    config.optimization = {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
    };
    // config.output.pathinfo = false;
}

module.exports = config;
