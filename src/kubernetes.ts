/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { tkn as tkn } from './tkn';
import * as cliInstance from './cli';
import { TektonItem } from './tekton/tektonitem';
import { TknPipelineTrigger } from './tekton';
import { collectWizardContent } from './tekton/collect-data-for-wizard';
import { PipelineWizard } from './pipeline/wizard';
import { ViewColumn, window } from 'vscode';
import { createWizardForTask } from './tekton/start-task-or-clustertask';
import { telemetryLogError } from './telemetry';
import { Command } from './cli-command';
import { startPipelineFromJson } from './tekton/start-pipeline-from-json';
import { TaskModel } from './util/resource-kind';

interface K8sClusterExplorerItem {
  nodeType: 'resource';
  nodeCategory?: string;
  kind: K8sClusterExplorerItemKind;
  name: string;
  kindName?: string;
}

interface K8sClusterExplorerItemKind {
  displayName?: string;
  pluralDisplayName?: string;
  manifestKind?: string;
  abbreviation?: string;
}

class K8sCommands extends TektonItem {
  showLogs(context: K8sClusterExplorerItem): void {
    if (context?.kind?.abbreviation === 'taskruns') {
      tkn.executeInTerminal(Command.showTaskRunLogs(context.name));
    } else if (context?.kind?.abbreviation === 'pipelineruns') {
      tkn.executeInTerminal(Command.showPipelineRunLogs(context.name));
    } else {
      throw new Error(`Can't handle log request for ${context.name}`);
    }
  }

  followLogs(context: K8sClusterExplorerItem): void {
    if (context?.kind?.abbreviation === 'taskruns') {
      tkn.executeInTerminal(Command.showTaskRunFollowLogs(context.name));
    } else if (context?.kind?.abbreviation === 'pipelineruns') {
      tkn.executeInTerminal(Command.showPipelineRunFollowLogs(context.name));
    } else {
      throw new Error(`Can't handle log request for ${context.name}`);
    }
  }

  async startPipeline(context: K8sClusterExplorerItem, commandId?: string): Promise<void | string> {
    if (!context) return null;
    const result: cliInstance.CliExitData = await K8sCommands.tkn.execute(Command.getPipeline(context.name), process.cwd(), false);
    let pipeline: TknPipelineTrigger;
    if (result.error) {
      telemetryLogError(commandId, result.error);
      window.showErrorMessage(`${result.error}  Std.err when processing pipelines`);
      return;
    }
    try {
      pipeline = JSON.parse(result.stdout);
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    const trigger = await collectWizardContent(pipeline.metadata.name, pipeline.spec.params, pipeline.spec.resources, pipeline.spec.workspaces, false);
    if (commandId) trigger.commandId = commandId;
    if (!trigger.workspaces && !trigger.resources && !trigger.params) {
      delete trigger.serviceAccount;
      await startPipelineFromJson(trigger);
    } else {
      PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Start Pipeline', trigger.name);
    }
  }

  async startTask(context: K8sClusterExplorerItem, commandId?: string): Promise<string> {
    return await createWizardForTask(context.name, TaskModel.kind, commandId);
  }
}

export const k8sCommands = new K8sCommands();

