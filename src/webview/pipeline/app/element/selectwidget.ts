/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Widget, BaseWidget } from '../common/widget';
import { createDiv } from '../utils/util';
import { EditItem } from '../utils/maincontent';
import { InputWidget } from './inputwidget';
import { NameType, Trigger } from '../common/types';

export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor(id?: string, public trigger?: Trigger) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add('editor-select-box');
    // this.select.onclick = () => this.selectText(this.select.parentNode);
    this.select.onchange = () => this.addInputBox(this.select.parentNode.parentNode, this.select.value);
    this.element.appendChild(this.select);
  }

  addInputBox(event: Node & ParentNode, value: string): void {
    console.log(this.trigger);
    console.log(event);
    console.log(value);
    if (value.trim() === 'Create Pipeline Resource' && event.lastElementChild.id.trim() !== 'input-resource') {
      const input = new EditItem('URL', new InputWidget('Please provide Name/URL'), 'input-resource');
      console.log(event.lastElementChild.id);
      event.appendChild(input.getElement());
    } else if (event.lastElementChild.id.trim() === 'input-resource') {
      event.lastElementChild.remove()
    }
  }

  pipelineResource(items: string[], resource: NameType): Widget {
    items.forEach(val => {
      if (val['spec'].type === resource.type) {
        const op = document.createElement('option');
        op.value = val['metadata'].name;
        op.text = val['metadata'].name;
        this.select.appendChild(op);
      }
    });
    return this;
  }

  workspaces(type: unknown): Widget {
    Object.keys(type).forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      this.select.appendChild(op);
    });
    return this;
  }
}
