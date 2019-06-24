/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';

export class Pipeline extends TektonItem {

    static async create(treeItem: TektonNode): Promise<String> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "In which Project you want to create an Pipeline");
        if (!pipeline) return null;
        const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines();
        const pipelineName = await Pipeline.getName('Pipeline name', pipelineList);
        if (!pipelineName) return null;
        return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipelineName}'.`, () =>
            Pipeline.tkn.startPipeline(pipeline)
                .then(() => `Pipeline '${pipelineName}' successfully created`)
                .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`)));
    }

    static async describe(treeItem: TektonNode): Promise<void> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "From which project you want to describe Pipeline",
            "Select Pipeline you want to describe");
        if (pipeline) Pipeline.tkn.executeInTerminal(Command.describePipelines());
    }

    static async list(treeItem: TektonNode): Promise<void> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "From which project you want to describe Pipeline",
            "Select Pipeline you want to describe");
        if (pipeline) Pipeline.tkn.executeInTerminal(Command.listPipelines());
    }

}