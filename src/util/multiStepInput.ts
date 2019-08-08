/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QuickPickItem, window, Disposable, CancellationToken, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons, Uri } from 'vscode';
import { PipelineTrigger } from '../tekton/pipeline';
import * as k8s from 'vscode-kubernetes-tools-api';
import { notEqual } from 'assert';
import { ExecSyncOptionsWithBufferEncoding } from 'child_process';
import { pipeline } from 'stream';
/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export async function startPipelineObject(context: PipelineTrigger[]): Promise<PipelineTrigger> {
	let inputPipelineTrigger: PipelineTrigger;
	const resources: QuickPickItem[] = context[0].resources.map<QuickPickItem>(label => ({ label: label.name }));

	interface State {
		title: string;
		step: number;
		totalSteps: number;
		resource: QuickPickItem | string;
		name: string;
		serviceAcct: QuickPickItem;
	}

	interface PipeParams {
		name: string;
		value: string;
	}

	interface PipelineRef {
		name: string;
		type: string;
		params: PipeParams[];
	}

	async function collectInputs() {
		const state = {} as Partial<State>;
		while (resources.length > 0) {
			await MultiStepInput.run(input => pickResourceGroup(input, state));
		}
		return state as State;
	}

	const title = 'Start Pipeline';

	async function pickResourceGroup(input: MultiStepInput, state: Partial<State>) {
		const pick = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 3,
			placeholder: 'Input Pipeline resources',
			validate: validateNameIsUnique,
			items: resources,
			activeItem: typeof state.resource !== 'string' ? state.resource : undefined,
			shouldResume: shouldResume
		});
		const pipelineRef = await PipelineResourceReturn(pick.label);
		state.resource = pick;
		resources.splice(resources.indexOf(pick), 1);
		return (input: MultiStepInput) => inputName(input, state, pipelineRef);
	}

	async function inputResourceGroupName(input: MultiStepInput, state: Partial<State>) {
		state.resource = await input.showInputBox({
			title,
			step: 2,
			totalSteps: 3,
			value: typeof state.resource === 'string' ? state.resource : '',
			prompt: 'Input Pipeline Parameters',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => inputName(input, state);
	}

	async function inputName(input: MultiStepInput, state: Partial<State>, pipelineRef: PipelineRef[]) {
		const pipelineRefName: QuickPickItem[] = pipelineRef.map<QuickPickItem>(label => ({ label: label.name }));
		const additionalSteps = typeof state.resource === 'string' ? 1 : 0;
		// TODO: Remember current value when navigating back.
		const pick = await input.showQuickPick({
			title,
			step: 2 + additionalSteps,
			totalSteps: 3 + additionalSteps,
			placeholder: 'Input Pipeline Resources',
			items: pipelineRefName,
			value: state.name || '',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		state.resource = pick;
		return (input: MultiStepInput) => pickServiceAcct(input, state);
	}

	async function pickServiceAcct(input: MultiStepInput, state: Partial<State>) {
		const additionalSteps = typeof state.resource === 'string' ? 1 : 0;
		const svcAcct = await getServiceAcct(state.resource!, undefined /* TODO: token */);
		// TODO: Remember currently active item when navigating back.
		state.serviceAcct = await input.showQuickPick({
			title,
			step: 3 + additionalSteps,
			totalSteps: 3 + additionalSteps,
			placeholder: 'Input Service Account',
			items: svcAcct,
			activeItem: state.serviceAcct,
			shouldResume: shouldResume
		});
	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {

		});
	}

	async function PipelineResourceReturn(name: string): Promise<PipelineRef[]> {
		let pipeR: any[] = [];
		const element = context[0].resources.find(e => e.name === name);
		const kubectl = await k8s.extension.kubectl.v1;
		if (kubectl.available) {
			const k8output = await kubectl.api.invokeCommand('get pipelineresources -o json');
			try {
				pipeR = JSON.parse(k8output.stdout).items;
			} catch (ignore) {

			}
		}
		let pipeResources = pipeR.map<PipelineRef>(value => ({
			name: value.metadata.name,
			type: value.spec.type,
			params: value.spec.params
		})).filter(function (obj) {
            return obj.type === element.type;
		});
		
		return pipeResources;
	}

	async function validateNameIsUnique(name: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return name === 'vscode' ? 'Name not unique' : undefined;
	}

	async function getServiceAcct(resource: QuickPickItem | string, token?: CancellationToken): Promise<QuickPickItem[]> | null {
		if (context[0].serviceAcct) {
			return [context[0].serviceAcct, 'Input New Service Account']
				.map(label => ({ label }));
		}
		return null;
	}

	const state = await collectInputs();
	window.showInformationMessage(`Creating Pipeline '${state.name}'`);
	return inputPipelineTrigger;
}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
	private constructor() { }
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

	static async run<T>(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.placeholder = placeholder;
				input.items = items;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				let validating = validate('');
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async text => {
						const current = validate(text);
						validating = current;
						const validationMessage = await current;
						if (current === validating) {
							input.validationMessage = validationMessage;
						}
					}),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}
}