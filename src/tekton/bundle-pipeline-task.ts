/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProgressLocation, ViewColumn, window } from 'vscode';
import { CliExitData } from '../cli';
import { Command } from '../cli-command';
import { BundleWizard, TektonType } from '../pipeline/bundle';
import { K8sTask, TknPipeline, TknPipelineTrigger } from '../tekton';
import { tkn } from '../tkn';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Platform } from '../util/platform';
import { getStderrString } from '../util/stderrstring';
import { clusterPipelineStatus } from '../util/map-object';

interface BundleType {
  imageDetail: string;
  resourceDetail: {tektonType: string, name: string}[];
  userDetail: string;
  passwordDetail: string;
}

export async function bundleWizard(): Promise<void> {
  if (clusterPipelineStatus.get('tekton.cluster')) {
    window.showWarningMessage('Please check that your cluster is working fine and try again.');
    return;
  }
  if (clusterPipelineStatus.get('tekton.pipeline')) {
    window.showWarningMessage('Please install the Pipelines Operator.');
    return;
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


// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export async function createBundle(bundleInfo: BundleType, bundleWizard: any): Promise<void> {
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
  return await window.withProgress({title: 'Bundling image.....', location: ProgressLocation.Notification}, async () => {
    const result = await tkn.execute(Command.bundle(bundleInfo.imageDetail, `${quote}${fsPath}${quote}`, bundleInfo.userDetail, bundleInfo.passwordDetail), process.cwd(), false);
    if (result.error) {
      window.showErrorMessage(`Failed to push the bundle. Please check the following error: ${getStderrString(result.error)}`);
      return;
    }
    bundleWizard.dispose();
    window.showInformationMessage('Tekton Bundle successfully pushed and added to the tekton manifest.');
    return;
  });
}
