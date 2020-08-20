/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from './widget';
import { Trigger, PipelineStart } from '../utils/types';
import { createItem } from '../utils/item';
import { vscode } from '../index';
import { addItemInWorkspace, collectParameterData } from '../utils/resource';
import { disableRemoveButton, blockStartButton } from '../utils/disablebutton';
import { TknResourceType } from '../utils/const';

export class ButtonsPanel extends BaseWidget {
  private startButton: HTMLElement;

  constructor(
    textContent?: string,
    className?: string,
    buttonClassName?: string,
    public trigger?: Trigger,
    public optionId?: string,
    public selectOption?: string,
    id?: string,
    public initialValue?: PipelineStart
  ) {
    super();
    this.element = document.createElement('div');
    this.element.className = className ?? '';
    this.startButton = document.createElement('a');
    this.startButton.textContent = textContent ?? '';
    this.startButton.id = id ?? '';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = buttonClassName ?? '';
    this.startButton.onclick = () => this.addItem(this.startButton.parentNode.parentNode);
    this.element.id = id ?? '';
    this.element.appendChild(this.startButton);
  }

  addItem(event: Node & ParentNode): void {
    try {
      if (event.lastElementChild.firstElementChild.className === 'startButton') {
        this.storeItemData(event.querySelectorAll('[id^=items-section-workspace-new-item]'));
        this.storeParamData(event.querySelectorAll(`[id^=${TknResourceType.Params}-input-field-content-data]`));
        vscode.postMessage({
          type: 'startPipeline',
          body: this.initialValue
        });
      }
    } catch (err) {
      // ignore if fails to find statButton
    }
    const itemData = event.parentNode;
    if (event.lastChild.parentElement.id === 'items-section-workspace-new-item') {
      const selectedItem = itemData.querySelectorAll('[id^=items-section-workspace-new-item]');
      if (selectedItem.length !== 1) {
        event.lastChild.parentElement.remove();
        disableRemoveButton(itemData);
      }
    }
    if (this.optionId) {
      createItem(event, this.optionId, this.selectOption, this.initialValue, this.trigger);
    }
    blockStartButton();
  }

  storeParamData(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const name = val.firstElementChild.innerText;
        const defaultValue = val.getElementsByTagName('input')[0].value;
        collectParameterData(name, defaultValue, this.initialValue);
      });
    }
  }

  storeItemData(data: NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const resourceName = val.parentNode.parentElement.firstElementChild.id;
        const key = val.getElementsByTagName('select')[0].value;
        const value = val.getElementsByTagName('input')[0].value;
        if (value) addItemInWorkspace(resourceName, key, value, this.initialValue);
      });
    }
  }
}
