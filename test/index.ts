/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

require('source-map-support').install();

let mode: string = process.env.VSCOST_TEST_MODE || 'coverage';
module.exports = require(`./index.${mode}`);