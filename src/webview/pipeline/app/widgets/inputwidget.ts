/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from '../utils/util';
import { BaseWidget } from './widget';
import { PipelineStart } from '../utils/types';
import { TknResourceType } from '../utils/const';
import { collectParameterData, collectResourceData } from '../utils/resource';
import { disableButton } from '../index';

export class InputWidget extends BaseWidget {
  public input: HTMLInputElement;
  constructor(text?: string,
    className?: string,
    public initialValue?: PipelineStart,
    disabledType?: boolean,
    wrapperId?: string,
    inputId?: string,
    inputTitle?: string
  ) {
    super();
    const editorInput = createDiv(className ?? 'editor-input-box');
    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.autocapitalize = 'off';
    this.input.spellcheck = false;
    this.input.placeholder = text ?? '';
    this.input.type = 'text';
    this.input.id = inputId ?? '';
    this.input.disabled = disabledType ?? false;
    this.input.title = inputTitle ?? '';
    this.element = editorInput;
    const wrapper = createDiv('wrapper', wrapperId);
    wrapper.appendChild(this.input);
    this.input.oninput = () => this.getValue(this.input);
    this.input.onblur = () => this.validator();
    this.input.onfocus = () => this.removeError();
    editorInput.appendChild(wrapper);
  }

  removeError(): void {
    this.addSpaceInItem(this.input.parentNode.parentNode.parentElement);
    if (this.input.parentNode.parentNode.parentElement.lastElementChild.id === 'label-text-id') {
      this.input.parentNode.parentNode.parentElement.lastElementChild.remove();
    }
  }

  addSpaceInItem(addItemContent: HTMLElement, className?: string): void {
    if (addItemContent.id === 'items-section-workspace-new-item') {
      this.input.parentNode.parentNode.parentElement.className = className ?? '';
    }
  }

  validator(): void {
    if (!this.input.value) {
      this.addSpaceInItem(this.input.parentNode.parentNode.parentElement, 'items-section-workspace');
      const createLabel = document.createElement('label');
      createLabel.innerText = 'Required';
      createLabel.className = 'label-text';
      createLabel.id = 'label-text-id';
      this.input.parentNode.parentElement.className = 'editor-input-box-error';
      this.input.parentNode.parentNode.parentElement.appendChild(createLabel);
    } else {
      this.removeError();
      this.input.parentNode.parentElement.className = 'editor-input-box';
    }
  }

  getValue(input: HTMLInputElement): void {
    disableButton(document.getElementsByTagName('input'));
    const initialValue = this.initialValue;
    if (input.parentNode.parentNode.parentNode.parentElement.id === TknResourceType.Params) {
      collectParameterData(input.parentNode.parentNode.parentNode.firstElementChild.id, this.input.value, initialValue);
    }
    const resource = input.parentNode.parentNode.parentNode.parentNode.parentElement.id.trim();
    if (resource === TknResourceType.GitResource || resource === TknResourceType.ImageResource) {
      const name = input.parentNode.parentNode.parentNode.parentNode.firstElementChild.id;
      const resourceRef = this.input.value;
      collectResourceData(name, resourceRef, this.initialValue);
    }
  }
}
