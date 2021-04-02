/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { customTektonExplorer } from './pipeline/customTektonExplorer';
import { telemetryLog } from './telemetry';

export enum VSCodeCommands {
  SetContext = 'setContext',
}


export enum CommandContext {
  TreeZenMode = 'tekton:zenMode',
  PipelinePreview = 'tekton:pipelinePreview',
  TknCli = 'tekton:tkn',
  Trigger = 'tekton:trigger',
}


export function setCommandContext(key: CommandContext | string, value: string | boolean): PromiseLike<void> {
  return commands.executeCommand(VSCodeCommands.SetContext, key, value);
}

export function enterZenMode(): void {
  setCommandContext(CommandContext.TreeZenMode, true);
  customTektonExplorer.showSelected(true);

}

export function exitZenMode(): void {
  setCommandContext(CommandContext.TreeZenMode, false);
  customTektonExplorer.showSelected(false);
}

export function refreshCustomTree(commandId?: string): void {
  telemetryLog(commandId, 'Custom refresh command call');
  customTektonExplorer.refresh();
}

export function removeItemFromCustomTree(commandId?: string): void {
  telemetryLog(commandId, 'Custom remove command call');
  customTektonExplorer.removeItem();
}
