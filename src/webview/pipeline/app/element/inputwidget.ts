/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from '../utils/util';
import { BaseWidget } from '../common/widget';
import { PipelineStart } from '../common/types';

export class InputWidget extends BaseWidget {
  public input: HTMLInputElement;
  constructor(text?: string, className?: string, public initialValue?: PipelineStart) {
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
    // this.input.onblur = () => this.getValue(this.input);
    editorInput.appendChild(wrapper);
  }

  getValue(input: HTMLInputElement): void {
    if (input.parentNode.parentNode.parentNode.parentElement.id === 'Parameters') {
      this.parameter(input.parentNode.parentNode.parentElement.id, this.input.value);
    }
  }

  parameter(paramName: string, defaultValue: string): void {
    if (this.initialValue.params.length === 0) {
      this.initialValue.params.push({name: paramName, default: defaultValue})
    } else {
      this.initialValue.params.map(val => {
        if (val.name === paramName) {
          val.default = defaultValue;
        }
      })
    }
    console.log(this.initialValue.params);
  }
}
