/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { cli } from '../cli';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { Command, getStderrString } from '../tkn';
import { Platform } from '../util/platform';


interface PVC {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    accessMode: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    volumeMode: string;
  };
}

export async function createPvc(PersistentVolumeClaim: PVC[]): Promise<boolean> {
  if (PersistentVolumeClaim.length === 0) return null;
  for (const pvc of PersistentVolumeClaim) {
    console.log(pvc);
    const quote = Platform.OS === 'win32' ? '"' : '\'';
    const pvcYaml = yaml.safeDump(pvc, {skipInvalid: true});
    const tempPath = os.tmpdir();
    if (!tempPath) {
      return false;
    }
    const fsPath = path.join(tempPath, `${pvc.metadata.name}.yaml`);
    await fs.writeFile(fsPath, pvcYaml, 'utf8');
    const result = await cli.execute(Command.apply(`${quote}${fsPath}${quote}`));
    if (result.error) {
      vscode.window.showErrorMessage(`Fail to deploy Resources: ${getStderrString(result.error)}`);
      return false;
    }
    if (!result.error) vscode.window.showInformationMessage('Pvc successfully created.');
    await fs.unlink(fsPath);
  }
}
