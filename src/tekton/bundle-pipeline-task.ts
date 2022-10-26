/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ViewColumn } from 'vscode';
import { CliExitData } from '../cli';
import { Command } from '../cli-command';
import { BuildWizard, TektonType } from '../pipeline/bundle';
import { K8sTask, TknPipeline } from '../tekton';
import { tkn } from '../tkn';



export async function bundleWizard(): Promise<void> {
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
  BuildWizard.create({storePipelineTaskClusterTask, resourceColumn: ViewColumn.Active}, ViewColumn.Active);
}
