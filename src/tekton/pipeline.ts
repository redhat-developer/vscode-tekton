/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { startPipelineObject } from '../util/multiStepInput';
import { Progress } from '../util/progress';
import { QuickPickItem, window } from 'vscode';
import * as cliInstance from '../cli';
import { Cli } from '../cli';


export interface NameType {
    name: string;
    type: string;
}

export interface PipelineTrigger {
    name: string;
    resources: NameType[];
    params?: NameType[];
    serviceAcct: string;
}

export class Pipeline extends TektonItem {

    static async start(pipeline: TektonNode): Promise<string> {
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

            let pipelinetrigger = data.map<PipelineTrigger>(value => ({
                        name: value.metadata.name,
                        resources: value.spec.resources, 
                        param: value.spec.params ? value.spec.params : undefined,
                        serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
            })).filter(function (obj) {
                return obj.name === pipeline.getName();
            });
            const options: { [key: string]: (pipelinetrigger) => Promise<PipelineTrigger> } = {
                startPipelineObject,
            };
            const quickPick = window.createQuickPick();
            quickPick.items = Object.keys(options).map(label => ({ label }));
            quickPick.onDidChangeSelection(selection => {
                if (selection[0]) {
                    options[selection[0].label](pipelinetrigger)
                        .catch(console.error);
                }
            });
            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.show();
            /*         const pipeline = await Pipeline.getTektonCmdData(context,
                        "Which Pipeline do you want to start",
                        "Select Pipeline to restart"); */

            return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
                Pipeline.tkn.startPipeline(pipeline)
                    .then(() => `Pipeline '${pipeline.getName}' successfully created`)
                    .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`))
            );
        }
        return null;
    }
    static async restart(pipeline: TektonNode): Promise<string> {
        if (pipeline) {
            return Progress.execFunctionWithProgress(`Creating the Pipeline '${pipeline.getName()}'.`, () =>
                Pipeline.tkn.restartPipeline(pipeline)
                    .then(() => `Pipeline '${pipeline.getName()}' successfully created`)
                    .catch((error) => Promise.reject(`Failed to create Pipeline with error '${error}'`))
            );
        }
        return null;
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

    static async describe(pipeline: TektonNode): Promise<void> {
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.describePipelines(pipeline.getName())); }
    }

    static async list(pipeline: TektonNode): Promise<void> {
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.listPipelinesInTerminal(pipeline.getName())); }
    }

    static async delete(pipeline: TektonNode): Promise<void> {
        if (pipeline) {Pipeline.tkn.executeInTerminal(Command.deletePipeline(pipeline.getName())); }
    }

}