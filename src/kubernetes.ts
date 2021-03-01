/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command, tkn as tkn } from './tkn';
import * as cliInstance from './cli';
import { TektonItem } from './tekton/tektonitem';
import { TknPipelineTrigger } from './tekton';
import { pipelineData } from './tekton/webviewstartpipeline';
import { startPipeline } from './tekton/startpipeline';
import { PipelineWizard } from './pipeline/wizard';
import { ViewColumn, window } from 'vscode';
import { startTask } from './tekton/starttask';
import { telemetryError } from './telemetry';

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
    let data: TknPipelineTrigger;
    if (result.error) {
      telemetryError(commandId, result.error);
      window.showErrorMessage(`${result.error}  Std.err when processing pipelines`);
      return;
    }
    try {
      data = JSON.parse(result.stdout);
    } catch (ignore) {
      //show no pipelines if output is not correct json
    }
    const trigger = await pipelineData(data);
    if (commandId) trigger.commandId = commandId;
    if (!trigger.workspaces && !trigger.resources && !trigger.params) {
      await startPipeline(trigger);
    } else {
      PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Start Pipeline', trigger.name);
    }
  }

  async startTask(context: K8sClusterExplorerItem, commandId?: string): Promise<string> {
    return await startTask(context.name, commandId);
  }
}

export const k8sCommands = new K8sCommands();

