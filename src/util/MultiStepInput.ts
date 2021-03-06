/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-atomic-updates */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable header/header */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QuickPickItem, window, Disposable, QuickInput, QuickInputButtons } from 'vscode';

// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() { }
  static back = new InputFlowAction();
  static cancel = new InputFlowAction();
}

interface QuickPickParameters<T extends QuickPickItem> {
  title: string;
  items: T[];
  placeholder: string;
}

interface InputBoxParameters {
  title: string;
  prompt: string;
  validate: (value: string) => Promise<string | undefined>;
}

export class MultiStepInput {

  private current?: QuickInput;

  async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, items, placeholder }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
        const input = window.createQuickPick<T>();
        input.ignoreFocusOut = true;
        input.title = title;
        input.placeholder = placeholder;
        input.items = items;
        disposables.push(
          input.onDidTriggerButton(item => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(item as any);
            }
          }),
          input.onDidChangeSelection(items => resolve(items[0])),
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => { d.dispose() });
      if (this.current) this.current.dispose();
    }
  }

  async showInputBox<P extends InputBoxParameters>({ title, prompt, validate }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
        const input = window.createInputBox();
        input.ignoreFocusOut = true;
        input.title = title;
        input.prompt = prompt;
        let validating = validate('');
        disposables.push(
          input.onDidTriggerButton(item => {
            if (item === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(item as any);
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
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => d.dispose());
      if (this.current) this.current.dispose();
    }
  }
}

export const multiStepInput = new MultiStepInput();
