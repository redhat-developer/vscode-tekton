/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ViewColumn, window } from 'vscode';
import { CliExitData } from '../cli';
import { Command } from '../cli-command';
import { checkEnableApiFields, FeatureFlag } from '../debugger/debug';
import { BundleWizard, TektonType } from '../pipeline/bundle';
import { K8sTask, TknPipeline, TknPipelineTrigger } from '../tekton';
import { tkn } from '../tkn';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Platform } from '../util/platform';
import { getStderrString } from '../util/stderrstring';

interface BundleType {
  imageDetail: string;
  resourceDetail: {tektonType: string, name: string}[]
}

export async function bundleWizard(): Promise<void> {
  const featureFlagData: FeatureFlag = await checkEnableApiFields();
  if (!featureFlagData) return null;
  if (featureFlagData.data['enable-tekton-oci-bundles'] !== 'true') {
    window.showWarningMessage('To enable bundles change enable-tekton-oci-bundles to "true" in "feature-flags" ConfigMap namespace tekton-pipelines');
    return null;
  }
  const storePipelineTaskClusterTask: TektonType['storePipelineTaskClusterTask'] = []
  const pipeline: CliExitData = await tkn.execute(Command.listPipelines(), process.cwd(), false);
  if (pipeline.stdout) {
    const listPipeline: TknPipeline[] = JSON.parse(pipeline.stdout).items;
    listPipeline.forEach(value => {
      storePipelineTaskClusterTask.push({tektonType: value.kind, name: value.metadata.name});
    });
  }
  const task: CliExitData = await tkn.execute(Command.listTasks(), process.cwd(), false);
  if (task.stdout) {
    const listTask: K8sTask[] = JSON.parse(task.stdout).items;
    listTask.forEach(value => {
      storePipelineTaskClusterTask.push({tektonType: value.kind, name: value.metadata.name});
    });
  }
  const cluster: CliExitData = await tkn.execute(Command.listClusterTasks(), process.cwd(), false);
  if (cluster.stdout) {
    const listCluster: K8sTask[] = JSON.parse(cluster.stdout).items;
    listCluster.forEach(value => {
      storePipelineTaskClusterTask.push({tektonType: value.kind, name: value.metadata.name});
    });
  }
  BundleWizard.create({storePipelineTaskClusterTask, resourceColumn: ViewColumn.One}, ViewColumn.One);
}


export const getRandomChars = (len = 7): string => {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);
}

const authRegex = /UNAUTHORIZED: authentication required/gm;

async function showInputBox(promptMessage: string, passwordType?: boolean, inputValidMessage?: string): Promise<string> {
  // eslint-disable-next-line no-return-await
  return await window.showInputBox({
    ignoreFocusOut: true,
    prompt: promptMessage,
    password: passwordType,
    validateInput: (value: string) => {
      if (!value?.trim()) {
        return inputValidMessage;
      }
      return null;
    },
  });
}


export async function createBuild(bundleInfo: BundleType): Promise<void> {
  const template: TknPipelineTrigger = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: '',
    metadata: {
      name: ''
    }
  }
  const tempPath = os.tmpdir();
  if (!tempPath) {
    return;
  }
  const quote = Platform.OS === 'win32' ? '"' : '\'';
  const fsPath = path.join(tempPath, `${getRandomChars()}.yaml`);
  for (const resource of bundleInfo.resourceDetail) {
    template.kind = resource.tektonType;
    template.metadata.name = resource.name;
    const taskOrPipelineOrClusterTaskYaml = yaml.dump(template);
    await fs.appendFile(fsPath, `${taskOrPipelineOrClusterTaskYaml}\n---\n`, {encoding: 'utf8'});
  }
  const result = await tkn.execute(Command.bundle(bundleInfo.imageDetail, `${quote}${fsPath}${quote}`), process.cwd(), false);
  if (result.error) {
    if (authRegex.test(getStderrString(result.error))) {
      const userName = await showInputBox('Provide username for image registry.', false, 'Provide an username for image registry.');
      if (!userName) return;
      const userPassword = await showInputBox('Provide password for image registry.', true, 'Provide a password for image registry.');
      if (!userPassword) return;
      const result = await tkn.execute(Command.bundle(bundleInfo.imageDetail, `${quote}${fsPath}${quote}`, userName, userPassword), process.cwd(), false);
      if (result.error) {
        window.showErrorMessage(`Failed to push bundle error: ${getStderrString(result.error)}`);
        return;
      }
      window.showInformationMessage('Bundle successfully push.');
      return;
    }
    window.showErrorMessage(`Failed to push bundle error: ${getStderrString(result.error)}`);
    return;
  }
  window.showInformationMessage('Bundle successfully push.');
  return;
}
