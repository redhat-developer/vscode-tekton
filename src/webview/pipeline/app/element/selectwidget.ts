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
  constructor(id?: string, public trigger?: Trigger, classList?: string) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add(classList ?? 'editor-select-box');
    // this.select.onclick = () => this.selectText(this.select.parentNode);
    this.select.onchange = () => this.addElement(this.select.parentNode.parentNode, this.select);
    this.element.appendChild(this.select);
  }

  addElement(event: Node & ParentNode, select: HTMLSelectElement): void {
    if (select.value.trim() === 'Create Pipeline Resource' && event.lastElementChild.id.trim() !== 'input-resource') {
      const input = new EditItem('URL', new InputWidget('Please provide Name/URL'), 'input-resource', 'inner-editItem');
      event.appendChild(input.getElement());
    } else if (event.lastElementChild.id.trim() === 'input-resource') {
      event.lastElementChild.remove();
    }
    try {
      const sectionId = `${select.value}-Workspaces`;
      const editId = 'Workspaces-Edit';
      const optionId = select[select.selectedIndex].id;
      if (optionId) {
        const selectItem = new SelectWidget(null, null, 'editor-select-box-item').selectItem(this.trigger[optionId], select.value);
        const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
        event.appendChild(selectItemOp.getElement());
        event.lastChild.appendChild(new InputWidget('Enter a path').getElement());
      }
      if (this.trigger[select.value]) {
        if (event.lastElementChild.id.trim() === editId) event.lastElementChild.remove();
        const workspacesType = new SelectWidget(sectionId, this.trigger).workspacesResource(this.trigger[select.value], select.value);
        const workspacesOp = new EditItem(VolumeTypes[select.value], workspacesType, editId, 'inner-editItem');
        event.appendChild(workspacesOp.getElement());
        selectText(document.querySelectorAll(`[id^=${sectionId}]`), `Select a ${VolumeTypes[select.value]}`, true);
      } else if (event.lastElementChild.id.trim() === editId) {
        event.lastElementChild.remove();
      }
    } catch (err) {
      // ignores
    }
  }

  selectItem(items: string[], name?: string): Widget {
    items.forEach(val => {
      if (val['metadata'].name === name) {
        Object.keys(val['data']).forEach(value => {
          const op = document.createElement('option');
          op.value = value;
          op.text = value;
          this.select.appendChild(op);
        });
      }
    });
    return this;
  }

  workspacesResource(items: string[], id?: string): Widget {
    items.forEach(val => {
      const op = document.createElement('option');
      op.value = val['metadata'].name;
      op.text = val['metadata'].name;
      op.id = id ?? '';
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
