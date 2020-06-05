/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

module.exports = [];

const viewEntries = fs.readdirSync(__dirname);

viewEntries.forEach((name) => {
  const dir = path.join(__dirname, name)
  const stat = fs.statSync(dir);
  if (stat.isDirectory()) {
    const webpack = path.join(dir, 'webpack.config.js')
    const exists = fs.existsSync(webpack);
    if (exists) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      module.exports.push(require(webpack));
    }
  }
})
