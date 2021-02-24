/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { TektonItem } from './tektonitem';
import { TektonNode, Command, PipelineTaskRunData, ContextType, getStderrString } from '../tkn';
import { window, workspace } from 'vscode';
import { cli, CliCommand } from '../cli';
import { showLogInEditor } from '../util/log-in-editor';
import { TknTaskRun } from '../tekton';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Platform } from '../util/platform';
import sendTelemetry, { telemetryError, telemetryProperties, TelemetryProperties } from '../telemetry';

export class TaskRun extends TektonItem {

  static async getTaskRunData(taskRunName: string): Promise<TknTaskRun>{
    const result = await TaskRun.tkn.execute(Command.getTaskRun(taskRunName), undefined, false);
    if (result.error) {
      window.showErrorMessage(`TaskRun not Found: ${result.error}`)
      return;
    }
    let data: TknTaskRun;
    try {
      data = JSON.parse(result.stdout);
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }
    return data;
  }

  static async restartTaskRun(taskRun: TektonNode, commandId?: string): Promise<void> {
    const taskRunTemplate = {
      apiVersion: 'tekton.dev/v1beta1',
      kind: 'TaskRun',
      metadata: {
        generateName: `${taskRun.getName()}-`
      }
    }
    const taskRunContent = await TaskRun.getTaskRunData(taskRun.getName());
    taskRunTemplate['spec'] = taskRunContent.spec;
    const tempPath = os.tmpdir();
    if (!tempPath) {
      return;
    }
    let telemetryProps: TelemetryProperties;
    if (commandId) {
      telemetryProps = telemetryProperties(commandId);
    }
    const quote = Platform.OS === 'win32' ? '"' : '\'';
    const fsPath = path.join(tempPath, `${taskRunTemplate.metadata.generateName}.yaml`);
    const taskRunYaml = yaml.dump(taskRunTemplate);
    await fs.writeFile(fsPath, taskRunYaml, 'utf8');
    const result = await cli.execute(Command.create(`${quote}${fsPath}${quote}`));
    await fs.unlink(fsPath);
    if (result.error) {
      if (commandId) {
        telemetryError(commandId, result.error, telemetryProps);
      }
      window.showErrorMessage(`Fail to restart TaskRun: ${getStderrString(result.error)}`);
    } else {
      const message = 'TaskRun successfully restarted';
      if (commandId) {
        telemetryProps['message'] = message;
        sendTelemetry(commandId, telemetryProps);
      }
      window.showInformationMessage(message);
    }
  }

  static async listFromPipelineRun(pipelineRun: TektonNode): Promise<void> {
    if (!pipelineRun) {
      pipelineRun = await window.showQuickPick(await TaskRun.getPipelineRunNames(), { placeHolder: 'Select PipelineRun to list TaskRun', ignoreFocusOut: true });
    }
    if (!pipelineRun) return null;
    TaskRun.tkn.executeInTerminal(Command.listTaskRunsForPipelineRunInTerminal(pipelineRun.getName()));
  }

  static async listFromTask(taskRun: TektonNode): Promise<void> {
    if (!taskRun) {
      taskRun = await window.showQuickPick(await TaskRun.getTaskNames(), { placeHolder: 'Select Task to list TaskRun', ignoreFocusOut: true });
    }
    if (!taskRun) return null;
    TaskRun.tkn.executeInTerminal(Command.listTaskRunsForTasksInTerminal(taskRun.getName()));
  }

  static async logs(taskRun: TektonNode): Promise<void> {
    if (!taskRun) {
      taskRun = await window.showQuickPick(await TaskRun.getTaskRunNames(), { placeHolder: 'Select Task Run to see logs', ignoreFocusOut: true });
    }
    if (!taskRun) {
      return;
    }
    if (workspace.getConfiguration('vs-tekton').get('showLogInEditor')) {
      showLogInEditor(Command.showTaskRunLogs(taskRun.getName()), `Log: ${taskRun.getName()}`);
    } else {
      TaskRun.tkn.executeInTerminal(Command.showTaskRunLogs(taskRun.getName()));
    }
  }

  static async followLogs(taskRun: TektonNode): Promise<void> {
    if (!taskRun) {
      taskRun = await window.showQuickPick(await TaskRun.getTaskRunNames(), { placeHolder: 'Select Task Run to see follow logs', ignoreFocusOut: true });
    }
    if (!taskRun) {
      return;
    }
    if (workspace.getConfiguration('vs-tekton').get('showLogInEditor')) {
      showLogInEditor(Command.showTaskRunFollowLogs(taskRun.getName()), `Log: ${taskRun.getName()}`);
    } else {
      TaskRun.tkn.executeInTerminal(Command.showTaskRunFollowLogs(taskRun.getName()));
    }
  }

  static getDeleteCommand(item: TektonNode): CliCommand {
    return Command.deleteTaskRun(item.getName());
  }

  static async openDefinition(taskRun: TektonNode, commandId?: string): Promise<void> {
    if (!taskRun) {
      taskRun = await window.showQuickPick(await TaskRun.getTaskRunNames(), { placeHolder: 'Select Task Run to Open Task Definition', ignoreFocusOut: true });
    }
    if (!taskRun) return null;
    const taskName = await TaskRun.getTaskNameByTaskRun(taskRun.getName());
    if (taskName) {
      TektonItem.loadTektonResource(taskName[0], taskName[1], taskRun.uid, commandId);
    }
  }

  static async openConditionDefinition(conditionRun: TektonNode, commandId?: string): Promise<void> {
    if (!conditionRun) return null;
    TektonItem.loadTektonResource(ContextType.CONDITIONS, conditionRun.getName(), conditionRun.uid, commandId);
  }

  private static async getTaskNameByTaskRun(taskRunName: string): Promise<[string, string] | undefined> {
    const result = await TaskRun.tkn.execute(Command.getTaskRun(taskRunName), undefined, false);
    if (result.error) {
      window.showErrorMessage(`TaskRun may not have started yet, try again when it starts running. "${result.error}"`)
      return;
    }
    let data: PipelineTaskRunData;
    try {
      data = JSON.parse(result.stdout);
      // eslint-disable-next-line no-empty
    } catch (ignore) {
    }

    if (data.metadata.labels['tekton.dev/conditionCheck']) {
      window.showErrorMessage(`Cannot find Condition definition for: ${taskRunName}. Please look in Pipeline definition`);
      return;
    }

    return [data.spec.taskRef?.kind ?? 'task', data.metadata.labels['tekton.dev/task']];
  }
}
