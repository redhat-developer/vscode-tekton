/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import { window } from 'vscode';

export class PipelineResource extends TektonItem {

    
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
