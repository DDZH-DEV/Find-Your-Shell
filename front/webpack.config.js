var glob = require('glob');
var path = require('path');
//var JavaScriptObfuscator = require('webpack-obfuscator');
//entries函数
var entries = function () {
    var jsDir = path.resolve(__dirname, 'src')
    var entryFiles = glob.sync(jsDir + '/*.{js,jsx}')
    var map = {};
    for (var i = 0; i < entryFiles.length; i++) {
        var filePath = entryFiles[i];
        var filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'));
        map[filename] = filePath;
    }
    return map;
}
module.exports = {
    entry: entries(),
    output: {
        path: path.resolve(__dirname, '..') + '/public/static/js',
        filename: '[name].js'
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style', 'css']
        },
            {
                test: /\.html$/,
                loader: 'raw-loader'
            }
        ]
    },
    plugins: [
        // new JavaScriptObfuscator({
        //     rotateStringArray: true,
        //     disableConsoleOutput: true
        // }, [])

    ],
    optimization: {
        //minimize: true,
        /*
        splitChunks: {
            cacheGroups: {
                commoms: {
                    name: 'webpack.chunks.common',
                    chunks: 'initial',
                    minChunks: 3
                }
            }
        }

         */
    } 
};
