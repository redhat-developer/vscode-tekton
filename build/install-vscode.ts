/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import cp = require('child_process');
import path = require('path');
import { platform } from 'os';
const downloadAndUnzipVSCode = require('vscode-test').downloadAndUnzipVSCode;
downloadAndUnzipVSCode('1.41.0').then((executable: string) => {
  if (platform() === 'darwin') {
    executable = `'${path.join(executable.substring(0, executable.indexOf('.app')+4), 'Contents', 'Resources', 'app', 'bin', 'code')}'`;
  } else {
    executable = path.join(path.dirname(executable), 'bin', 'code');
  }
  cp.execSync(`${executable} --install-extension ms-kubernetes-tools.vscode-kubernetes-tools`);
});
