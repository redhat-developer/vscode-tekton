/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  performance: { hints: false },
  entry: {
    'pipeline-preview': {import: './src/webview/pipeline-preview/index.ts', filename: 'webview/[name]/index.js'},
    'pipeline-wizard': {import: './src/webview/pipeline/app/index.ts', filename: 'webview/[name]/index.js'},
    'bundle': {import: './src/webview/bundle/index.tsx', filename: 'webview/[name]/index.js'},
    'tekton-hub': {import: './src/webview/hub/index.ts', filename: 'webview/[name]/index.js'},
    'resource-view': {import: './src/webview/resource-page/index.ts', filename: 'webview/[name]/index.js'}
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use:
                {
                  loader: 'ts-loader',
                  options: {
                    configFile: 'webview-tsconfig.json'
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
        test: /\.(woff|woff2|ttf|eot)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'webview/assets/'
        }
      },
      {
        test: /\.(jpe?g|png|svg?)(\?[a-z0-9=&.]+)?$/,
        use: 'base64-inline-loader?limit=1000&name=[name].[ext]'
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  devtool: 'inline-source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'out')
  }
};
