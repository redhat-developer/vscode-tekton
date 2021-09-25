/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { window } from 'vscode';
import { cli } from '../cli';
import { Command } from '../cli-command';
import { TaskRun } from '../tekton/taskrun';
import { TektonNode } from '../tree-view/tekton-node';
import { Platform } from '../util/platform';
import { Progress } from '../util/progress';
import { getStderrString } from '../util/stderrstring';
import { debugExplorer } from './debugExplorer';
import { telemetryLogError } from '../telemetry';
import { TknTaskRun } from '../tekton';
import { sessions } from './debug-tree-view';

interface FeatureFlag {
  data: {
    'enable-api-fields': string;
  };
}

const getRandomChars = (len = 7): string => {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);
}


export function debug(taskRun: TektonNode): Promise<string | null> {
  return Progress.execFunctionWithProgress(`Starting debugger session for the TaskRun '${taskRun.getName()}'.`, () => startDebugger(taskRun));
}

async function startDebugger(taskRun: TektonNode): Promise<string> {
  const result = await cli.execute(Command.featureFlags());
  if (result.error) {
    window.showErrorMessage(`Fail to fetch data: ${getStderrString(result.error)}`);
    return null;
  }
  const featureFlagData: FeatureFlag = JSON.parse(result.stdout);
  if (featureFlagData.data['enable-api-fields'] === 'alpha') {
    const resourceName = `${taskRun.getName()}-${getRandomChars(7)}`;
    const createTaskRun = await startTaskRunWithDebugger(taskRun, resourceName, 'debug_start');
    if (!createTaskRun) return null;
    sessions.set(resourceName, {resourceType: taskRun.contextValue});
    debugExplorer.refresh();
  } else {
    window.showWarningMessage('To enable debugger change enable-api-fields to alpha');
  }
}


async function startTaskRunWithDebugger(taskRun: TektonNode, resourceName: string, commandId?: string): Promise<boolean> {
  const taskRunTemplate: TknTaskRun = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'TaskRun',
    metadata: {
      name: resourceName
    }
  }
  const taskRunContent = await TaskRun.getTaskRunData(taskRun.getName());
  taskRunTemplate.spec = taskRunContent.spec;
  taskRunTemplate.metadata.labels = taskRunContent.metadata.labels;
  taskRunTemplate.spec.debug = {breakpoint: ['onFailure']};
  const tempPath = os.tmpdir();
  if (!tempPath) {
    return;
  }
  const quote = Platform.OS === 'win32' ? '"' : '\'';
  const fsPath = path.join(tempPath, `${taskRunTemplate.metadata.generateName}.yaml`);
  const taskRunYaml = yaml.dump(taskRunTemplate);
  await fs.writeFile(fsPath, taskRunYaml, 'utf8');
  const result = await cli.execute(Command.create(`${quote}${fsPath}${quote}`));
  if (result.error) {
    telemetryLogError(commandId, result.error.toString().replace(fsPath, 'user path'));
    window.showErrorMessage(`Fail to start TaskRun: ${getStderrString(result.error)}`);
    return false;
  }
  await fs.unlink(fsPath);
  return true;
}
