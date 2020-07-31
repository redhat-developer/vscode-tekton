/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  performance: { hints: false },
  entry: {
    index: path.join(__dirname, './app/index.ts')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use:
        {
          loader: 'ts-loader',
          options: {
            configFile: path.join(__dirname, './tsconfig.json')
          }
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: /\.(jpg|svg|woff|woff2|ttf|eot|ico)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'assets/'
        }
      },
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  devtool: 'inline-source-map',
  output: {
    filename: '[name].js',
    path: path.resolve('out', 'webview', 'pipeline')
  }
};
