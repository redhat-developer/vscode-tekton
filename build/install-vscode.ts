/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import cp = require('child_process');
import path = require('path');
import { platform } from 'os';
const downloadAndUnzipVSCode = require('vscode-test').downloadAndUnzipVSCode;
downloadAndUnzipVSCode().then((executable: string) => {
  if (platform() === 'darwin') {
    executable = `'${path.join(executable.substring(0, executable.indexOf('.app') + 4), 'Contents', 'Resources', 'app', 'bin', 'code')}'`;
  } else {
    executable = path.join(path.dirname(executable), 'bin', 'code');
  }
  const dependencies = ['redhat.vscode-yaml'];
  for (const dep of dependencies) {
    const installLog = cp.execSync(`${executable} --install-extension ${dep}`);
    console.log(installLog.toString());
  }
});
