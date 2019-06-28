/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Tkn, TknImpl, TektonNode } from '../tkn';
import { PipelineExplorer } from '../pipeline/pipelineExplorer';
import { window } from 'vscode';
import * as validator from 'validator';

const errorMessage = {
    Pipeline: 'You need at least one Pipeline available. Please create new Tekton Pipeline and try again.',
    Pipelinerun: 'You need at least one Pipelinerun available. Please create new Tekton Pipelinerun and try again.',
    Task: 'You need at least one Task available. Please create new Tekton Task and try again.',
    Taskrun: 'You need at least one Taskrun available. Please create new Tekton Taskrun and try again.',
    Clustertask: 'You need at least one Clustertask available. Please create new Tekton Clustertask and try again.',
};

export abstract class TektonItem {
    protected static readonly tkn: Tkn = TknImpl.Instance;
    protected static readonly explorer: PipelineExplorer = PipelineExplorer.getInstance();

    static validateUniqueName(data: Array<TektonNode>, value: string) {
        const tektonNode =  data.find((tektonNode) =>  tektonNode.getName() === value);
        return tektonNode && `This name is already used, please enter different name.`;
    }

    static async getName(message: string, data: Array<TektonNode>, offset?: string): Promise<string> {
        return await window.showInputBox({
            prompt: `Provide ${message}`,
            validateInput: (value: string) => {
                let validationMessage = TektonItem.emptyName(`Empty ${message}`, value.trim());
                if (!validationMessage) validationMessage = TektonItem.validateMatches(`Not a valid ${message}. Please use lower case alphanumeric characters or "-", start with an alphabetic character, and end with an alphanumeric character`, value);
                if (!validationMessage) validationMessage = TektonItem.lengthName(`${message} should be between 2-63 characters`, value, offset ? offset.length : 0);
                if (!validationMessage) validationMessage = TektonItem.validateUniqueName(data, value);
                return validationMessage;
            }
        });
    }

    static emptyName(message: string, value: string) {
        return validator.isEmpty(value) ? message : null;
    }

    static lengthName(message: string, value: string, offset: number) {
        return validator.isLength(value, 2, 63 - offset) ? null : message;
    }

    static validateMatches(message: string, value: string) {
        return (validator.matches(value, '^[a-z]([-a-z0-9]*[a-z0-9])*$')) ? null : message;
    }

    static async getPipelineNames(): Promise<TektonNode[]> {
        const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines();
        if (pipelineList.length === 0) throw Error(errorMessage.Pipeline);
        return pipelineList;
    }

    static async getPipelinerunNames(pipeline: TektonNode): Promise<TektonNode[]> {
        const pipelinerunList: Array<TektonNode> = await TektonItem.tkn.getPipelineRuns(pipeline);
        if (pipelinerunList.length === 0) throw Error(errorMessage.Pipelinerun);
        return pipelinerunList;
    }

    static async getTaskNames(task: TektonNode) {
        const taskList: Array<TektonNode> = await TektonItem.tkn.getTasks(task);
        if (taskList.length === 0) throw Error(errorMessage.Task);
        return taskList;
    }

    static async getTaskRunNames(taskrun: TektonNode) {
        const taskrunList: Array<TektonNode> = await TektonItem.tkn.getTaskRuns(taskrun);
        if (taskrunList.length === 0) throw Error(errorMessage.Taskrun);
        return taskrunList;
    }

    static async getTektonCmdData(treeItem: TektonNode, projectPlaceholder: string, pipelinePlaceholder?: string, taskPlaceholder?: string) {
        let context = treeItem;
        if (!context) {
            context = await window.showQuickPick(TektonItem.getPipelineNames(), {placeHolder: projectPlaceholder});
            if (context && pipelinePlaceholder) context = await window.showQuickPick(TektonItem.getPipelinerunNames(context), {placeHolder: pipelinePlaceholder});
            if (context && taskPlaceholder) context = await window.showQuickPick(TektonItem.getTaskNames(context), {placeHolder: taskPlaceholder});
        }
        return context;
    }
}