/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from '../utils/util';
import { BaseWidget } from '../common/widget';

export class InputWidget extends BaseWidget {
  constructor(text?: string, className?: string) {
    super();
    const editorInput = createDiv(className ?? 'editor-input-box');
    const input = document.createElement('input');
    input.classList.add('input');
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = text ?? '';
    input.type = text;
    this.element = editorInput;
    const wrapper = createDiv('wrapper');
    wrapper.appendChild(input);
    editorInput.appendChild(wrapper);
  }
}
