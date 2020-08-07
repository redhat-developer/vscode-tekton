/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Widget, BaseWidget } from './widget';
import { createDiv } from '../utils/util';
import { EditItem } from './maincontent';
import { InputWidget } from './inputwidget';
import { NameType, Trigger, PipelineStart, Workspaces } from '../utils/types';
import { VolumeTypes, TknResourceType } from '../utils/const';
import { selectText, disableButton } from '../index';
import { collectResourceData, collectWorkspaceData } from '../utils/resource';
import { createItem } from '../utils/item';
import { disableSelection } from '../utils/disablebutton';

export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor(id?: string,
    public trigger?: Trigger,
    classList?: string,
    public initialValue?: PipelineStart
  ) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add(classList ?? 'editor-select-box');
    this.select.onchange = () => this.addElement(this.select.parentNode.parentNode, this.select);
    this.element.appendChild(this.select);
  }

  addElement(event: Node & ParentNode, select: HTMLSelectElement): void {
    this.enableInputBox(event.parentNode.querySelector('[id^=enable-input-box-workspace]'), event.parentElement);
    if (select.value.trim() === 'Create Pipeline Resource' && event.lastElementChild.id.trim() !== 'input-resource') {
      const input = new EditItem('URL', new InputWidget('Please provide Name/URL', null, this.initialValue), 'input-resource', 'inner-editItem');
      event.appendChild(input.getElement());
    } else if (event.lastElementChild.firstElementChild.id.trim() === 'input-resource') {
      event.lastElementChild.remove();
    }
    if (event.parentNode.firstElementChild.textContent === TknResourceType.GitResource || event.parentNode.firstElementChild.textContent === TknResourceType.ImageResource) {
      if (select.value.trim() !== 'Create Pipeline Resource') {
        collectResourceData(event.firstElementChild.id, select.value, this.initialValue);
      }
    }
    if (event.parentNode.firstElementChild.textContent === TknResourceType.Workspaces || event.parentNode.parentNode.firstElementChild.textContent === TknResourceType.Workspaces) {
      this.clickEvent(event);
    }
    disableButton(document.getElementsByTagName('input'));
    this.createWorkspaceElement(event, select);
  }

  enableInputBox(event: Node & ParentNode, parentElement: HTMLElement): void {
    if (event && parentElement.id !== TknResourceType.Workspaces) {
      if (event.parentNode.parentNode.querySelector('select').firstElementChild.innerHTML === 'Select a key') {
        const input = event.querySelector('input');
        input.removeAttribute('disabled');
        input.id = 'enabled';
        input.title = '';
        input.parentNode.parentElement.className = 'editor-input-box';
        event.parentNode.parentNode.querySelector('select').firstElementChild.remove();
      }
    }
  }

  blockStartButton(): void {
    disableSelection(document.getElementsByTagName('select'));
    disableButton(document.getElementsByTagName('input'));
  }

  createWorkspaceElement(event: Node & ParentNode, select: HTMLSelectElement): void {
    try {
      const sectionId = `${select.value}-Workspaces`;
      const editId = 'Workspaces-Edit';
      const optionId = select[select.selectedIndex].id;
      if (select.value === 'Select a PVC') {
        this.blockStartButton();
      }
      if (optionId === 'PersistentVolumeClaim') {
        this.blockStartButton();
      }
      if (this.trigger[select.value]) {
        this.dropdownForWorkspaceType(event, editId, sectionId, select);
      } else if (event.lastElementChild.firstElementChild.id.trim() === editId) {
        event.lastElementChild.remove();
        disableSelection(document.getElementsByTagName('select'));
      }
      if (optionId) {
        const selectedItem = event.querySelectorAll('[id^=items-section-workspace-new-item]');
        const buttonItem = event.querySelectorAll('.elementButtons');
        if (optionId === 'select-workspace-option') {
          selectedItem.forEach(element => element.remove());
          buttonItem.forEach(element => element.remove());
        }
        this.createElementForKeyAndPath(selectedItem, buttonItem, event, optionId, select);
      }
    } catch (err) {
      // ignores
    }
  }

  dropdownForWorkspaceType(event: Node & ParentNode, editId: string, sectionId: string, select: HTMLSelectElement): void {
    if (event.lastElementChild.firstElementChild.id.trim() === editId) event.lastElementChild.remove();
    const workspacesType = new SelectWidget(sectionId, this.trigger, null, this.initialValue).workspacesResource(this.trigger[select.value], select.value);
    const workspacesOp = new EditItem(VolumeTypes[select.value], workspacesType, editId, 'inner-editItem');
    event.appendChild(workspacesOp.getElement());
    selectText(event.querySelectorAll(`[id^=${sectionId}]`), `Select a ${VolumeTypes[select.value]}`, true, 'select-workspace-option');
    disableSelection(document.getElementsByTagName('select'));
  }

  createElementForKeyAndPath(selectedItem: unknown[] | NodeListOf<Element>, buttonItem: unknown[] | NodeListOf<Element>, event: Node & ParentNode, optionId: string, select: HTMLSelectElement): void {
    if (selectedItem.length) {
      selectedItem.forEach((element: { remove: () => unknown }) => element.remove());
      buttonItem.forEach((element: { remove: () => unknown }) => element.remove());
      createItem(event, optionId, select.value, this.initialValue, this.trigger);
    } else {
      createItem(event, optionId, select.value, this.initialValue, this.trigger);
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
    collectResourceData(resource.name, this.select.value, this.initialValue);
    return this;
  }

  workspaces(type: unknown, resource: Workspaces): Widget {
    Object.keys(type).forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      this.select.appendChild(op);
    });
    collectWorkspaceData(resource.name, this.select.value, this.initialValue);
    return this;
  }

  clickEvent(event: Node & ParentNode): void {
    if (event.parentNode.firstElementChild.textContent === TknResourceType.Workspaces) {
      const name = event.firstElementChild.id;
      const workspaceType = this.select.value;
      collectWorkspaceData(name, workspaceType, this.initialValue);
    }
    if (event.parentNode.parentNode.firstElementChild.textContent === TknResourceType.Workspaces) {
      const name = event.parentNode.firstElementChild.id;
      const workspaceResourceName = this.select.value;
      collectWorkspaceData(name, undefined, this.initialValue, workspaceResourceName)
    }
  }
}
