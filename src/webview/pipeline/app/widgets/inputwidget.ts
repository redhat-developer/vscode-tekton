/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDivWithID } from '../../../common/dom-util';
import { BaseWidget } from '../../../common/widget';
import { PipelineStart } from '../utils/types';
import { TknResourceType } from '../utils/const';
import { collectResourceData } from '../utils/resource';
import { blockStartButton } from '../utils/disablebutton';

export class InputWidget extends BaseWidget {
  public input: HTMLInputElement;
  constructor(text?: string,
    className?: string,
    public initialValue?: PipelineStart,
    disabledType?: boolean,
    wrapperId?: string,
    inputId?: string,
    inputTitle?: string,
    inputValue?: string,
    number?: string
  ) {
    super();
    const editorInput = createDivWithID(className ?? 'editor-input-box');
    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.autocapitalize = 'off';
    this.input.spellcheck = false;
    this.input.placeholder = text ?? '';
    this.input.value = inputValue ?? '';
    this.input.type = number ?? 'text';
    if (number) {
      this.input.min = '0';
    }
    this.input.id = inputId ?? '';
    this.input.disabled = disabledType ?? false;
    this.input.title = inputTitle ?? '';
    this.element = editorInput;
    const wrapper = createDivWithID('wrapper', wrapperId);
    wrapper.appendChild(this.input);
    this.input.onkeydown = (event) => this.blockNegativeNumber(event, this.input);
    this.input.oninput = () => this.getValue(this.input);
    this.input.onblur = () => this.validator();
    this.input.onfocus = () => this.removeError();
    editorInput.appendChild(wrapper);
  }

  blockNegativeNumber(event: KeyboardEvent, input: HTMLInputElement): boolean {
    if (input?.id === 'size-for-pvc-create-webview') {
      const matchInputNumber = new RegExp('[0-9]|(Backspace)');
      if (!event.key.match(matchInputNumber)) {
        return false;
      }
    }
    return true;
  }

  removeError(): void {
    this.addSpaceInItem(this.input.parentNode.parentNode.parentElement);
    if (this.input.parentNode.parentNode.parentElement.lastElementChild.id === 'label-text-id') {
      this.input.parentNode.parentNode.parentElement.lastElementChild.remove();
    }
    this.paddingForParamInput();
  }

  addSpaceInItem(addItemContent: HTMLElement, className?: string): void {
    if (addItemContent.id === 'items-section-workspace-new-item') {
      this.input.parentNode.parentNode.parentElement.className = className ?? '';
    }
  }

  validator(): void {
    if (!this.input.value && this.input.parentElement.parentElement.parentElement.id.trim() !== 'Service-account-name-input-field-content-data') {
      this.addSpaceInItem(this.input.parentNode.parentNode.parentElement, 'items-section-workspace');
      const createLabel = document.createElement('label');
      createLabel.innerText = 'Required';
      createLabel.className = 'label-text';
      createLabel.id = 'label-text-id';
      if (this.input.id === 'size-for-pvc-create-webview') {
        this.input.parentNode.parentElement.className = 'number-input-box-error';
      } else {
        this.input.parentNode.parentElement.className = 'editor-input-box-error';
        this.addPaddingForParamInput();
      }
      this.input.parentNode.parentNode.parentElement.appendChild(createLabel);
    } else {
      this.removeError();
      if (this.input.id === 'size-for-pvc-create-webview') {
        this.input.parentNode.parentElement.className = 'number-input-box';
      } else {
        this.input.parentNode.parentElement.className = 'editor-input-box';
        this.paddingForParamInput();
      }
    }
  }

  paddingForParamInput(): void {
    const paramDescription = this.input.parentNode.parentElement.parentElement.querySelector('[id^=Description-Param]');
    if (paramDescription) {
      this.input.parentNode.parentElement.parentElement.className = 'editItem';
      paramDescription.className = 'Description-Param';
    }
  }

  addPaddingForParamInput(): void {
    const paramDescription = this.input.parentNode.parentElement.parentElement.querySelector('[id^=Description-Param]');
    if (paramDescription) {
      this.input.parentNode.parentElement.parentElement.className = 'editItem-param';
      paramDescription.className = 'Description-Param-top';
    }
  }

  getValue(input: HTMLInputElement): void {
    blockStartButton();
    const resource = input.parentNode.parentNode.parentNode.parentNode.parentElement.id.trim();
    if (resource === `${TknResourceType.GitResource}-vscode-webview-pipeline` || resource === `${TknResourceType.ImageResource}-vscode-webview-pipeline`) {
      const name = input.parentNode.parentNode.parentNode.parentNode.firstElementChild.id;
      const resourceRef = this.input.value;
      collectResourceData(name, resourceRef, this.initialValue);
    }
  }
}
