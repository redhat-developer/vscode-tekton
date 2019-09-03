/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';

export class PipelineResource extends TektonItem {

    
    static async describe(pipelineresource: TektonNode): Promise<void> {
        if (pipelineresource) { PipelineResource.tkn.executeInTerminal(Command.describePipelineResource(pipelineresource.getName())); }
    }
    
    static async list(pipelineresource: TektonNode): Promise<void> {
        if (pipelineresource) { PipelineResource.tkn.executeInTerminal(Command.listPipelineResourcesInTerminal(pipelineresource.getName())); }
    }

     static async delete(pipelineresource: TektonNode): Promise<void> {
        if (pipelineresource) { PipelineResource.tkn.executeInTerminal(Command.deletePipelineResource(pipelineresource.getName())); }
    }

}