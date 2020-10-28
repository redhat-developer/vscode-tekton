/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Widget, BaseWidget } from './widget';
import { createDiv } from '../utils/util';
import { EditItem } from './maincontent';
import { InputWidget } from './inputwidget';
import { NameType, Trigger, PipelineStart, Workspaces, TknPipelineResource, Item, TriggerType } from '../utils/types';
import { accessMode, size, TknResourceType, VolumeTypes, workspaceResource, workspaceResourceTypeName } from '../utils/const';
import { collectResourceData, collectWorkspaceData } from '../utils/resource';
import { triggerSelectedWorkspaceType, createElementForKeyAndPath } from '../utils/displayworkspaceresource';
import { blockStartButton } from '../utils/disablebutton';

export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor(id?: string,
    public trigger?: Trigger,
    classList?: string,
    public initialValue?: PipelineStart,
    selectID?: string
  ) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add(classList ?? 'editor-select-box');
    this.select.id = selectID ?? '';
    this.select.onchange = () => this.addElement(this.select.parentNode.parentNode, this.select);
    this.element.appendChild(this.select);
  }

  addElement(event: Node & ParentNode, select: HTMLSelectElement): void {
    this.triggerWebhook(event.querySelector('[id^=Add-Trigger-WebHook]'))
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
    if ((event.parentNode.firstElementChild.textContent === TknResourceType.Workspaces || event.parentNode.parentNode.firstElementChild.textContent === TknResourceType.Workspaces) && event.firstElementChild.textContent !== VolumeTypes.PersistentVolumeClaim) {
      this.clickEvent(event);
    }
    this.createWorkspaceElement(event, select);
    this.createPVC(event, select);
    const pvcSelect = event.lastElementChild.lastElementChild.getElementsByTagName('select');
    if (pvcSelect.length !== 0) {
      this.createPVC(event.lastElementChild, event.lastElementChild.lastElementChild.getElementsByTagName('select')[0]);
    }
    blockStartButton();
  }

  createPVC(event: Node & ParentNode, select: HTMLSelectElement): void {
    if (select[select.selectedIndex].id === 'create-new-PersistentVolumeClaim-entry') {
      const newDivClass = 'List-new-PVC-items-webview';
      const input = new EditItem('Persistent Volume Claim Name', new InputWidget('Please provide Name', null, this.initialValue, null, null, 'Webview-PVC-Name'), 'input-resource', 'inner-editItem');
      const selectAccessMode = new SelectWidget('editor-select-box-item-select-a-key', null, 'editor-select-box-item', this.initialValue, 'Access-Mode-for-Pvc').selectAccessMode();
      const selectAccessModeOp = new EditItem('Access Mode', selectAccessMode, 'option-workspace-id', 'inner-editItem');
      const inputNumber = new EditItem('Size', new InputWidget('', 'number-input-box', this.initialValue, null, null, 'size-for-pvc-create-webview', null, null, 'number'), 'input-resource', 'size-input-item');
      const selectSize = new SelectWidget('editor-select-box-item-select-a-key', null, 'size-select-box-item', this.initialValue, 'Size-for-PVC-Storage').selectSize();
      const selectSizeOp = new EditItem('', selectSize, 'option-workspace-id', 'size-select-item', null, true);   
      this.addPVCItem(event, input, selectAccessModeOp, selectSizeOp, inputNumber, newDivClass);
    }
    if (select[select.selectedIndex].id === 'PersistentVolumeClaim') {
      if (event.lastElementChild.id === 'List-new-PVC-items-webview') {
        event.lastElementChild.remove();
      }
    }
  }

  addPVCItem(event: Node & ParentNode, input: EditItem, selectAccessModeOp: EditItem, selectSizeOp: EditItem, inputNumber: EditItem, newDivClass: string): void{
    event.appendChild(createDiv(null, newDivClass));
    event.lastChild.appendChild(input.getElement());
    event.lastChild.appendChild(selectAccessModeOp.getElement());
    event.lastChild.appendChild(inputNumber.getElement());
    event.lastChild.appendChild(selectSizeOp.getElement());
  }

  selectSize(): Widget {
    size.forEach(val => {
      const op = document.createElement('option');
      op.value = val.value;
      op.text = val.name;
      this.select.appendChild(op);
    })
    return this;
  }

  selectAccessMode(): Widget {
    accessMode.forEach(val => {
      const op = document.createElement('option');
      op.value = val.value;
      op.text = val.name;
      this.select.appendChild(op);
    })
    return this;
  }

  triggerWebhook(event: Node & ParentNode): void {
    if (event) {
      if (event.querySelector('select').firstElementChild.innerHTML === 'Select Git Provider Type') {
        event.querySelector('select').firstElementChild.remove();
      }
    }
  }

  enableInputBox(event: Node & ParentNode, parentElement: HTMLElement): void {
    if (event && parentElement.id !== `${TknResourceType.Workspaces}-vscode-webview-pipeline`) {
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

  createWorkspaceElement(event: Node & ParentNode, select: HTMLSelectElement): void {
    try {
      const optionId = select[select.selectedIndex].id;
      triggerSelectedWorkspaceType(select, event, this.trigger, this.initialValue);
      if (optionId) {
        createElementForKeyAndPath(event, optionId, select, this.initialValue, this.trigger);
      }
    } catch (err) {
      // ignores
    }
  }

  selectItem(items: string[], name?: string, keyPath?: Item): Widget {
    items.forEach(val => {
      if (val['metadata'].name === name) {
        Object.keys(val['data']).forEach(value => {
          const op = document.createElement('option');
          op.value = value;
          op.text = value;
          if (keyPath && value === keyPath.key) {
            op.selected = true;
          }
          this.select.appendChild(op);
        });
      }
    });
    return this;
  }

  workspacesResource(items: TknPipelineResource[], id?: string, index?: number): Widget {
    items.forEach(val => {
      const op = document.createElement('option');
      op.value = val.metadata.name;
      op.text = val.metadata.name;
      op.id = id ?? '';
      try {
        if (this.trigger.pipelineRun.workspaces[index][workspaceResource[id]][workspaceResourceTypeName[id]] === val.metadata.name) {
          op.selected = true;
        }
      } catch (err) {
        // ignore if fails to find pipelineRun
      }
      this.select.appendChild(op);
    });
    return this;
  }

  pipelineResource(items: TknPipelineResource[], resource: NameType): Widget {
    items.forEach(val => {
      if (val.spec.type === resource.type) {
        const op = document.createElement('option');
        op.value = val.metadata.name;
        op.text = val.metadata.name;
        try {
          if (val.metadata.name === resource.resourceRef.name) {
            op.selected = true;
          }
        } catch (err) {
          // ignore if pipelineRun not found.
        }
        this.select.appendChild(op);
      }
    });
    collectResourceData(resource.name, this.select.value, this.initialValue);
    return this;
  }

  triggerOption(items: TriggerType[]): Widget {
    items.forEach(val => {
      const op = document.createElement('option');
      op.value = val.name;
      op.text = val.name;
      this.select.appendChild(op);
    });
    return this;
  }

  workspaces(type: unknown, resource: Workspaces): Widget {
    Object.keys(type).forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      if (resource[workspaceResource[val]]) {
        op.selected = true;
      }
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
