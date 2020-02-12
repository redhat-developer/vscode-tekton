/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';

export class PipelineResource extends TektonItem {

    static async create(): Promise<string> {
        const document = window.activeTextEditor ? window.activeTextEditor.document : undefined;
        const pleaseSave = 'Please save your changes before executing \'Tekton: Create\' command.';
        let message: string;

        if (!document || !document.fileName.endsWith('.yaml')) {
            message = '\'Tekton: Create\' command requires .yaml file opened in editor.';
        }

        if (!message && document.isUntitled) {
            message = pleaseSave;
        }

        if (!message && document.isDirty) {
            const save = 'Save';
            const action = await window.showInformationMessage('Editor has unsaved changes.', save);
            if (action !== save) {
                message = pleaseSave;
            } else {
                await document.save();
            }
        }

        if (message) {
            window.showWarningMessage(message);
        } else {
            return Progress.execFunctionWithProgress(`Creating PipelineResource`, () => 
                PipelineResource.tkn.execute(Command.createPipelineResource(document.fileName)))
                .then(() => 'PipelineResources were successfully created.')
                .catch((err) => Promise.reject(`Failed to Create PipelineResources with error: ${err}`));
        }

    }

    static async describe(pipelineresource: TektonNode): Promise<void> {
        if (pipelineresource) { PipelineResource.tkn.executeInTerminal(Command.describePipelineResource(pipelineresource.getName())); }
    }
    
    static async list(pipelineresource: TektonNode): Promise<void> {
        if (pipelineresource) { PipelineResource.tkn.executeInTerminal(Command.listPipelineResourcesInTerminal(pipelineresource.getName())); }
    }

    static async delete(pipelineresource: TektonNode): Promise<string> {
        const value = await window.showWarningMessage(`Do you want to delete the Resource '${pipelineresource.getName()}'?`, 'Yes', 'Cancel');
        if (value === 'Yes') {
            return Progress.execFunctionWithProgress(`Deleting the Resource '${pipelineresource.getName()}'.`, () => 
                PipelineResource.tkn.execute(Command.deletePipelineResource(pipelineresource.getName())))
                .then(() => `The Resource '${pipelineresource.getName()}' successfully deleted.`)
                .catch((err) => Promise.reject(`Failed to delete the Resource '${pipelineresource.getName()}': '${err}'.`));
        }
        return null;
    }

}
