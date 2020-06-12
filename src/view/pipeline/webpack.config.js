/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HtmlWebPackPlugin = require( 'html-webpack-plugin' );

module.exports = {
  entry: {
    pipelineView: './src/view/pipeline/app/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, '../../../out', 'pipelineView'),
    filename: '[name].js'
  },
  devtool: 'eval-source-map',
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|jsx)$/,
        loader: 'ts-loader',
        options: {}
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
        test: /\.scss$/,
        use: [
          'style-loader', //3. Inject styles into DOM
          'css-loader',  //2. Turns css into commonjs
          'sass-loader' //1. Turns sass into css
        ]
      },
      {
        test: /\.(svg|png|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {},
          },
        ],
      }
    ]
  },
  performance: {
    hints: false
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve( __dirname, './app/index.html' ),
      filename: 'index.html'
    })
  ]
};
