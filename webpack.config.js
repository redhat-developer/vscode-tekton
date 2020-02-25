/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  performance: { hints: false },
  entry: {
    index: './preview-src/index.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use:
                {
                  loader: 'ts-loader',
                  options: {
                    configFile: 'preview-src/tsconfig.json'
                  }
                },
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  devtool: 'inline-source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'preview')
  }
};
