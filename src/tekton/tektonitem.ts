/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, TknImpl, TektonNode } from '../tkn';
import { PipelineExplorer } from '../pipeline/pipelineExplorer';

const errorMessage = {
    Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
    PipelineRun: 'You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.',
    PipelineResource: 'You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.',
    Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
    TaskRun: 'You need at least one TaskRun available. Please create new Tekton TaskRun and try again.',
    ClusterTask: 'You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.',
};

/* export class QuickPickCommand implements QuickPickItem {
    constructor (public label: string,
        public command: () => Promise<string>,
        public description?: string,
        public detail?: string,
        public picked?: boolean,
        public alwaysShow?: boolean
    ) {

    }
} */

export abstract class TektonItem {
    protected static readonly tkn: Tkn = TknImpl.Instance;
    protected static readonly explorer: PipelineExplorer = PipelineExplorer.getInstance();

    static validateUniqueName(data: Array<TektonNode>, value: string): string {
        const tektonNode = data.find((tektonNode) => tektonNode.getName() === value);
        return tektonNode && 'This name is already used, please enter different name.';
    }

    static async getPipelineNames(pipeline: TektonNode): Promise<TektonNode[]> {
        const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines(pipeline);
        if (pipelineList.length === 0) { throw Error(errorMessage.Pipeline); }
        return pipelineList;
    }

    static async getPipelinerunNames(pipeline: TektonNode): Promise<TektonNode[]> {
        const pipelinerunList: Array<TektonNode> = await TektonItem.tkn.getPipelineRuns(pipeline);
        if (pipelinerunList.length === 0) { throw Error(errorMessage.PipelineRun); }
        return pipelinerunList;
    }

    static async getTaskNames(task: TektonNode): Promise<TektonNode[]> {
        const taskList: Array<TektonNode> = await TektonItem.tkn.getTasks(task);
        if (taskList.length === 0) { throw Error(errorMessage.Task); }
        return taskList;
    }

    static async getClusterTaskNames(clustertask: TektonNode): Promise<TektonNode[]> {
        const taskList: Array<TektonNode> = await TektonItem.tkn.getClusterTasks(clustertask);
        if (taskList.length === 0) { throw Error(errorMessage.ClusterTask); }
        return taskList;
    }

    static async getTaskRunNames(taskrun: TektonNode): Promise<TektonNode[]> {
        const taskrunList: Array<TektonNode> = await TektonItem.tkn.getTaskRuns(taskrun);
        if (taskrunList.length === 0) { throw Error(errorMessage.TaskRun); }
        return taskrunList;
    }

    static async getPipelineResourceNames(pipelineresource: TektonNode): Promise<TektonNode[]> {
        const pipelineresourceList: Array<TektonNode> = await TektonItem.tkn.getPipelineResources(pipelineresource);
        if (pipelineresourceList.length === 0) { throw Error(errorMessage.PipelineResource); }
        return pipelineresourceList;
    }
}

/*     static async getTektonCmdData(treeItem: TektonNode, pipelinePlaceholder?: string, taskPlaceholder?: string, clustertaskPlaceholder?: string) {
        let context: TektonNode | QuickPickCommand = treeItem;
        if (!context) { context = await window.showQuickPick(TektonItem.getPipelineResources(), {placeHolder: pipelinePlaceholder}); }
        if (context && context.contextValue === ContextType.PIPELINEpipelinePlaceholder) { context = await window.showQuickPick(TektonItem.getPipelinerunNames(context), {placeHolder: pipelinePlaceholder}); }
            if (context && taskPlaceholder) { context = await window.showQuickPick(TektonItem.getTaskNames(treeItem), {placeHolder: taskPlaceholder}); }
            if (context && clustertaskPlaceholder) { context = await window.showQuickPick(TektonItem.getClusterTaskNames(treeItem), {placeHolder: clustertaskPlaceholder}); }
        }
return c
    }
} */
