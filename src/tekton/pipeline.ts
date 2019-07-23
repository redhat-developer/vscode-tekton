/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { Progress } from '../util/progress';
import * as cliInstance from '../cli';
import { Cli } from '../cli';
import { QuickPickItem, window } from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

export class Pipeline extends TektonItem {

    static createFromFolder(createFromFolder: any, treeItem: any) {
        throw new Error("Method not implemented.");
    }

    static async getTektonData(treeItem: TektonNode): Promise<TektonNode> {
        return await Pipeline.getTektonCmdData(treeItem,
            "In which namespace do you want to create an Pipeline"
        );
    }
    static async startFromFolder(treeItem: TektonNode): Promise<string> {
        const pipeline = await Pipeline.getTektonData(treeItem);
        if (!pipeline) { return null; }
        const sourceTypes: QuickPickItem[] = [
            {
                label: 'Workspace Directory',
                description: 'Use workspace directory as a source for the Component'
            }
        ];
        const componentSource = await window.showQuickPick(sourceTypes, {
            placeHolder: "Select source type for Pipeline"
        });
        if (!componentSource) { return null; }

        const pipelineList: Array<TektonNode> = await TektonItem.tkn.getPipelines(pipeline);
        const pipelineName = await Pipeline.getName('Pipeline name', pipelineList);
        if (!pipelineName) { return null; }
        return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipelineName}'.`, () =>
            Pipeline.tkn.startPipeline(pipeline)
                .then(() => `Pipeline '${pipelineName}' successfully created`)
                .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`)));
    }
    static async start(treeItem: TektonNode): Promise<string> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "Which Pipeline do you want to restart",
            "Select Pipeline to restart");
        if (pipeline) {
            const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.listPipelines(), process.cwd(), false);
            let data: any[] = [];
            if (result.stderr) {
                console.log(result + " Std.err when processing pipelines");
            }
            try {
                data = JSON.parse(result.stdout).items;
            } catch (ignore) {
                //show no pipelines if output is not correct json
            }
            const pipelinetrigger = data.map(value => ({ name: value.metadata.name, resources: value.spec.resources, param: value.spec.params ? value.spec.params : undefined })).filter(function (obj) {
                return obj.name === treeItem.getName();
            });
            if (pipeline) { Pipeline.tkn.executeInTerminal(Command.startPipeline(pipelinetrigger[0].name, pipelinetrigger[0].resources, pipelinetrigger[0].param)); }
            if (!pipeline.getName()) { return null; }
            return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
                Pipeline.tkn.startPipeline(pipeline)
                    .then(() => `Pipeline '${pipeline.getName}' successfully created`)
                    .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`))
            );
        }
        return null;
    }
    static async restart(treeItem: TektonNode): Promise<string> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "Which Pipeline do you want to restart",
            "Select Pipeline to restart");
        if (pipeline) {
            return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
                Pipeline.tkn.restartPipeline(pipeline)
                    .then(() => `Pipeline '${pipeline.getName()}' successfully created`)
                    .then(this.refresh)
                    .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`))
            );
        }
        return null;
    }

    static createFromLocal(pipeline: TektonNode): Promise<string> {
        throw new Error("Method not implemented.");
    }

    static refresh(): void {
        Pipeline.explorer.refresh();
    }


    static about(): void {
        Pipeline.tkn.executeInTerminal(Command.printTknVersion());
    }

    static async showTektonOutput(): Promise<void> {
        Cli.getInstance().showOutputChannel();
    }

    static async describe(treeItem: TektonNode): Promise<void> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "Which Pipeline do you want to describe",
            "Select Pipeline you want to describe");
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.describePipelines(pipeline.getName())); }
    }

    static async list(treeItem: TektonNode): Promise<void> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "From which project do you want to describe Pipeline",
            "Select Pipeline you want to describe");
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.listPipelines()); }
    }

    static async delete(treeItem: TektonNode): Promise<void> {
        const pipeline = await Pipeline.getTektonCmdData(treeItem,
            "Which Pipeline do you want to delete",
            "Select Pipeline you want to delete");
        if (pipeline) { 
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) { await kubectl.api.invokeCommand('delete pipeline '+pipeline.getName()); }
        }
    }

}