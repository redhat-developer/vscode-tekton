/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { customTektonExplorer } from './pipeline/customTektonExplorer';

export enum VSCodeCommands {
    SetContext = 'setContext',
}


export enum CommandContext {
    TreeZenMode = 'tekton:zenMode'
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

export function refreshCustomTree(): void {
    customTektonExplorer.refresh();
}
