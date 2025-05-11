const path = require('path');

module.exports = {
  mode: 'development',
  entry: './js/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './'),  // 输出到根目录
  },
  ignoreWarnings: [
    {
      module: /node_modules\/@ffmpeg\/ffmpeg\/dist\/esm\/worker\.js/,
    },
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, '/'),
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};