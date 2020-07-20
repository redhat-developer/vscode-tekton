/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from '../utils/util';
import { BaseWidget } from '../common/widget';
import { PipelineStart } from '../common/types';
import { TknResourceType } from '../utils/const';
import { parameter, createResourceJson } from '../common/resource';

export class InputWidget extends BaseWidget {
  public input: HTMLInputElement;
  constructor(text?: string,
    className?: string,
    public initialValue?: PipelineStart
  ) {
    super();
    const editorInput = createDiv(className ?? 'editor-input-box');
    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.autocapitalize = 'off';
    this.input.spellcheck = false;
    this.input.placeholder = text ?? '';
    this.input.type = text;
    this.element = editorInput;
    const wrapper = createDiv('wrapper');
    wrapper.appendChild(this.input);
    this.input.oninput = () => this.getValue(this.input);
    editorInput.appendChild(wrapper);
  }

  getValue(input: HTMLInputElement): void {
    const initialValue = this.initialValue;
    if (input.parentNode.parentNode.parentNode.parentElement.id === TknResourceType.Params) {
      parameter(input.parentNode.parentNode.parentNode.firstElementChild.id, this.input.value, initialValue);
    }
    const resource = input.parentNode.parentNode.parentNode.parentNode.parentElement.id.trim();
    if (resource === TknResourceType.GitResource || resource === TknResourceType.ImageResource) {
      const name = input.parentNode.parentNode.parentNode.parentNode.firstElementChild.id;
      const resourceRef = this.input.value;
      createResourceJson(name, resourceRef, this.initialValue);
    }
  }
}
