/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { window } from 'vscode';
import semver = require('semver');
import { Command } from '../cli-command';
import { TaskRun } from '../tekton/taskrun';
import { TektonNode } from '../tree-view/tekton-node';
import { Platform } from '../util/platform';
import { Progress } from '../util/progress';
import { getStderrString } from '../util/stderrstring';
import { telemetryLogError } from '../telemetry';
import { TknTaskRun } from '../tekton';
import { watchTaskRunContainer } from './debug-tree-view';
import { TknVersion, version } from '../util/tknversion';
import { tkn } from '../tkn';

interface FeatureFlag {
  data: {
    'enable-api-fields': string;
  };
}

export function debug(taskRun: TektonNode): Promise<string | null> {
  return Progress.execFunctionWithProgress(`Starting debugger session for the TaskRun '${taskRun.getName()}'.`, () => startDebugger(taskRun));
}

export async function startDebugger(taskRun: TektonNode): Promise<string> {
  const getNewELSupport: TknVersion = await version();
  const compareVersion = semver.satisfies('0.26.0', `<=${getNewELSupport.pipeline}`);
  if (!compareVersion) {
    window.showWarningMessage('Debugger is supported above pipeline version: `0.26.0`');
    return null;
  }
  const result = await tkn.execute(Command.featureFlags(), process.cwd(), false);
  if (result.error) {
    window.showErrorMessage(`Fail to fetch data: ${getStderrString(result.error)}`);
    return null;
  }
  const featureFlagData: FeatureFlag = JSON.parse(result.stdout);
  if (featureFlagData.data['enable-api-fields'] === 'alpha') {
    const resourceName = await startTaskRunWithDebugger(taskRun, 'debug_start');
    if (!resourceName) return null;
    // sessions.set(resourceName, {resourceType: taskRun.contextValue});
    watchTaskRunContainer(resourceName, taskRun.contextValue);
    // debugExplorer.refresh();
  } else {
    window.showWarningMessage('To enable debugger change enable-api-fields to alpha in ConfigMap namespace tekton-pipelines');
    return null;
  }
}


async function startTaskRunWithDebugger(taskRun: TektonNode, commandId?: string): Promise<string> {
  const taskRunTemplate: TknTaskRun = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'TaskRun',
    metadata: {
      generateName: `${taskRun.getName()}-`
    }
  }
  const taskRunContent = await TaskRun.getTaskRunData(taskRun.getName());
  taskRunTemplate.spec = taskRunContent.spec;
  taskRunTemplate.metadata.labels = taskRunContent.metadata.labels;
  taskRunTemplate.spec.debug = {breakpoint: ['onFailure']};
  if (taskRunTemplate.spec.status) {
    delete(taskRunTemplate.spec.status);
  }
  const tempPath = os.tmpdir();
  if (!tempPath) {
    return;
  }
  const quote = Platform.OS === 'win32' ? '"' : '\'';
  const fsPath = path.join(tempPath, `${taskRunTemplate.metadata.generateName}.yaml`);
  const taskRunYaml = yaml.dump(taskRunTemplate);
  await fs.writeFile(fsPath, taskRunYaml, 'utf8');
  const result = await tkn.execute(Command.create(`${quote}${fsPath}${quote} -o json`));
  if (result.error) {
    telemetryLogError(commandId, result.error.toString().replace(fsPath, 'user path'));
    window.showErrorMessage(`Fail to start TaskRun: ${getStderrString(result.error)}`);
    await fs.unlink(fsPath);
    return null;
  }
  await fs.unlink(fsPath);
  const taskRunData: TknTaskRun = JSON.parse(result.stdout);
  return taskRunData.metadata.name;
}
