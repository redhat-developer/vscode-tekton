/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { TektonNode, Command } from '../tkn';
import { MultiStepInput, InputStep } from '../util/MultiStepInput';
import { Progress } from '../util/progress';
import { QuickPickItem, window } from 'vscode';
import * as cliInstance from '../cli';
import { CliImpl } from '../cli';
import * as k8s from 'vscode-kubernetes-tools-api';
import { TknPipelineResource, TknPipelineTrigger } from '../tekton';

export interface NameType {
    name: string;
    type: string;
}

export interface PipeResources {
    name: string;
    resourceRef: string;
}

export interface PipeParams {
    default: string;
    description: string;
    name: string;
}

export interface StartPipelineObject {
    name: string;
    resources: PipeResources[];
    params: PipeParams[];
    serviceAccount: string | undefined;
}

export interface PipelineTrigger {
    name: string;
    resources: NameType[];
    params?: PipeParams[];
    serviceAcct: string | undefined;
}

export class Pipeline extends TektonItem {

    static async start(pipeline: TektonNode): Promise<string> {
        if (pipeline) {
            const result: cliInstance.CliExitData = await Pipeline.tkn.execute(Command.listPipelines(), process.cwd(), false);
            let data: TknPipelineTrigger[] = [];
            if (result.error) {
                console.log(result + " Std.err when processing pipelines");
            }
            try {
                data = JSON.parse(result.stdout).items;
            } catch (ignore) {
                //show no pipelines if output is not correct json
            }

            const pipelinetrigger = data.map<PipelineTrigger>(value => ({
                name: value.metadata.name,
                resources: value.spec.resources,
                params: value.spec.params ? value.spec.params : undefined,
                serviceAcct: value.spec.serviceAccount ? value.spec.serviceAccount : undefined
            })).filter(function (obj) {
                return obj.name === pipeline.getName();
            });
            const inputStartPipeline = await Pipeline.startPipelineObject(pipelinetrigger);

            return Progress.execFunctionWithProgress(`Starting Pipeline '${inputStartPipeline.name}'.`, () =>
                Pipeline.tkn.startPipeline(inputStartPipeline)
                    .then(() => `Pipeline '${inputStartPipeline.name}' successfully started`)
                    .catch((error) => Promise.reject(`Failed to start Pipeline with error '${error}'`))
            );
        }
        return null;

    }

    static async startPipelineObject(context: PipelineTrigger[]): Promise<StartPipelineObject> {
        const resources: QuickPickItem[] = context[0].resources.map<QuickPickItem>(label => ({ label: label.name }));
        const params: QuickPickItem[] | undefined = context[0].params ? context[0].params.map<QuickPickItem>(label => ({ label: label.name })) : undefined;

        const title = 'Start Pipeline';

        interface PipelineRef {
            name: string;
            type: string;
        }

        const inputStartPipeline = {
            resources: [],
            params: [],
        } as StartPipelineObject;
        inputStartPipeline.name = context[0].name;
        inputStartPipeline.serviceAccount = context[0].serviceAcct;

        async function collectInputs(): Promise<void> {
            await MultiStepInput.run(input => pickResourceGroup(input));
        }

        async function pickResourceGroup(input: MultiStepInput): Promise<InputStep> {
            const pick = await input.showQuickPick({
                title,
                placeholder: 'Input Pipeline resources',
                items: resources,
            });
            const pipelineRef = await PipelineResourceReturn(pick.label);
            resources.splice(resources.indexOf(pick), 1);
            const selectedResource: PipeResources = {
                name: pick.label,
                resourceRef: await inputResources(input, pipelineRef),
            };
            inputStartPipeline.resources.push(selectedResource);
            if (resources.length > 0) {
                return pickResourceGroup(input);
            }
            if (params) {
                return (input: MultiStepInput): Promise<InputStep> => inputParameters(input);
            }
            if (inputStartPipeline.serviceAccount) {
                return (input: MultiStepInput): Promise<InputStep> => pickServiceAcct(input);
            }
        }

        async function inputResources(input: MultiStepInput, pipelineRef: PipelineRef[]): Promise<string> {
            const pipelineRefName: QuickPickItem[] = pipelineRef.map<QuickPickItem>(label => ({ label: label.name }));
            const pick = await input.showQuickPick({
                title,
                placeholder: 'Input Pipeline Resources',
                items: pipelineRefName,
            });
            return pick.label;
        }

        async function inputParameters(input: MultiStepInput): Promise<InputStep> {
            const pick = await input.showQuickPick({
                title,
                placeholder: 'Select Pipeline Parameter Name',
                items: params,
            });
            params.splice(params.indexOf(pick), 1);
            const paramVal = context[0].params.find(x => x.name === pick.label);
            return (input: MultiStepInput): Promise<InputStep> => inputParamValue(input, paramVal);
        }

        async function inputParamValue(input: MultiStepInput, selectedParam: PipeParams): Promise<InputStep> {
            const paramVals = await getParamValues(selectedParam.name);
            const pick = await input.showQuickPick({
                title,
                placeholder: 'Input Pipeline Parameter defaults',
                items: paramVals,
            });
            if (pick.label === selectedParam.name) {
                const parameter: PipeParams = { name: selectedParam.name, description: selectedParam.description, default: selectedParam.default };
                inputStartPipeline.params.push(parameter);
            }
            else {
                const inputVal = await input.showInputBox({
                    title,
                    prompt: 'Input Pipeline default Value',
                    validate: validateInput,
                });
                const parameter: PipeParams = { name: selectedParam.name, description: selectedParam.description, default: inputVal };
                inputStartPipeline.params.push(parameter);
            }
            if (params.length > 0) {
                return inputParameters(input);
            }
            if (inputStartPipeline.serviceAccount) {
                return (input: MultiStepInput): Promise<InputStep> => pickServiceAcct(input);
            }
            return;
        }

        async function pickServiceAcct(input: MultiStepInput): Promise<InputStep> {
            const svcAcct = await getServiceAcct();
            const pick = await input.showQuickPick({
                title,
                placeholder: 'Input Service Account',
                items: svcAcct,
            });
            inputStartPipeline.serviceAccount = pick.label;
            if (pick.label === (inputStartPipeline.serviceAccount || "None")) {
                return;
            }
            else if (pick.label === 'Input New Service Account') {
                const inputSvcAcct = await input.showInputBox({
                    title,
                    prompt: 'Input Service Account',
                    validate: validateInput,
                });
                // eslint-disable-next-line require-atomic-updates
                inputStartPipeline.serviceAccount = inputSvcAcct;
            }
        }

        async function PipelineResourceReturn(name: string): Promise<PipelineRef[]> {
            let pipeR: TknPipelineResource[] = [];
            const element = context[0].resources.find(e => e.name === name);
            const kubectl = await k8s.extension.kubectl.v1;
            if (kubectl.available) {
                const k8output = await kubectl.api.invokeCommand('get pipelineresources -o json');
                try {
                    pipeR = JSON.parse(k8output.stdout).items;
                } catch (ignore) {
                    // eslint-disable-next-line no-empty
                }
            }
            const pipeResources = pipeR.map<PipelineRef>(value => ({
                name: value.metadata.name,
                type: value.spec.type,
            })).filter(function (obj) {
                return obj.type === element.type;
            });

            return pipeResources;
        }

        async function validateInput(name: string): Promise<undefined | 'invalid'> {
            const alphaNumHyph = new RegExp(/^[a-zA-Z0-9-_]+$/);
            return name.match(alphaNumHyph) ? undefined : 'invalid';
        }

        async function getParamValues(paramName: string): Promise<QuickPickItem[]> | null {
            return [paramName, 'Input New Param Value']
                .map(label => ({ label }));
        }

        async function getServiceAcct(): Promise<QuickPickItem[]> | null {
            return [inputStartPipeline.serviceAccount, 'None', 'Input New Service Account']
                .map(label => ({ label }));
        }

        await collectInputs();
        return inputStartPipeline;

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
        CliImpl.getInstance().showOutputChannel();
    }

    static async describe(pipeline: TektonNode): Promise<void> {
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.describePipelines(pipeline.getName())); }
    }

    static async list(pipeline: TektonNode): Promise<void> {
        if (pipeline) { Pipeline.tkn.executeInTerminal(Command.listPipelinesInTerminal(pipeline.getName())); }
    }

    static async delete(pipeline: TektonNode): Promise<string> {
        const value = await window.showWarningMessage(`Do you want to delete the Pipeline '${pipeline.getName()}'?`, 'Yes', 'Cancel');
        if (value === 'Yes') {
            return Progress.execFunctionWithProgress(`Deleting the Pipeline '${pipeline.getName()}'.`, () =>
                Pipeline.tkn.execute(Command.deletePipeline(pipeline.getName())))
                .then(() => `The Pipeline '${pipeline.getName()}' successfully deleted.`)
                .catch((err) => Promise.reject(`Failed to delete the Pipeline '${pipeline.getName()}': '${err}'.`));
        }
        return null;
    }

}
