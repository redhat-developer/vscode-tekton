/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as extensionActivityTest from './extension-activity-test';
import * as commandPaletteTest from './command-palette-test';
import * as extensionViewTest from './extension-view-test';

describe('VSCode Tekton Public UI Tests Suite', () => {
  commandPaletteTest.commandPaletteTest()
  extensionActivityTest.extensionActivityTest();
  extensionViewTest.extensionViewTest();
});
