/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Widget, BaseWidget } from '../common/widget';
import { createDiv } from '../utils/util';
import { EditItem } from './maincontent';
import { InputWidget } from './inputwidget';
import { NameType, Trigger } from '../common/types';
import { VolumeTypes } from '../utils/const';
import { selectText } from '../index';

export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor(id?: string, public trigger?: Trigger) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add('editor-select-box');
    // this.select.onclick = () => this.selectText(this.select.parentNode);
    this.select.onchange = () => this.addElement(this.select.parentNode.parentNode, this.select.value);
    this.element.appendChild(this.select);
  }

  addElement(event: Node & ParentNode, value: string): void {
    if (value.trim() === 'Create Pipeline Resource' && event.lastElementChild.id.trim() !== 'input-resource') {
      const input = new EditItem('URL', new InputWidget('Please provide Name/URL'), 'input-resource');
      event.appendChild(input.getElement());
    } else if (event.lastElementChild.id.trim() === 'input-resource') {
      event.lastElementChild.remove();
    }
    try {
      const sectionId = `${value}-Workspaces`;
      const editId = 'Workspaces-Edit';
      console.log(this.trigger[value]);
      if (this.trigger[value]) {
        if (event.lastElementChild.id.trim() === editId) event.lastElementChild.remove();
        const workspacesType = new SelectWidget(sectionId).workspacesResource(this.trigger[value]);
        const workspacesOp = new EditItem(VolumeTypes[value], workspacesType, editId);
        event.appendChild(workspacesOp.getElement());
        selectText(document.querySelectorAll(`[id^=${sectionId}]`), `Select a ${VolumeTypes[value]}`, true);
      } else if (event.lastElementChild.id.trim() === editId) {
        event.lastElementChild.remove();
      }
    } catch (err) {
      // ignores
    }
  }

  workspacesResource(items: string[]): Widget {
    items.forEach(val => {
      const op = document.createElement('option');
      op.value = val['metadata'].name;
      op.text = val['metadata'].name;
      this.select.appendChild(op);
    });
    return this;
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
