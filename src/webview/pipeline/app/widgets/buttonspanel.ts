/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from '../../../common/widget';
import { Trigger, PipelineStart } from '../utils/types';
import { createItem } from '../utils/item';
import { vscode } from '../index';
import { addItemInWorkspace, collectParameterData, collectServiceAccountData, collectTriggerData, collectWorkspaceData, createNewPipelineResource, createPVC, createVCT, removePvcName, storePvcName } from '../utils/resource';
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
        this.storeParamData(event.querySelectorAll(`[id^=${TknResourceType.Params}-input-field-content-data]`));
        this.storeTriggerData(event.querySelectorAll('[id^=Webhook-add-trigger-webhook]'));
        this.storeNewPvcData(event.querySelectorAll('[id^=List-new-PVC-items-webview]'));
        this.storePvcContent(event.querySelectorAll('[id^=PersistentVolumeClaim-Workspaces]'));
        this.storeVolumeClaimTemplate(event.querySelectorAll('[id^=List-new-VCT-items-webview]'));
        this.storeWorkspaceResourceName(event.querySelectorAll('[id^=items-section-workspace-new-item]'));
        this.storeItemData(event.querySelectorAll('[id^=items-section-workspace-new-item]'));
        this.storeServiceAccountData(event.querySelectorAll('[id^=Service-account-name-input-field-content-data]'));
        this.storeNewResourceData(event.querySelectorAll('[id^=Create-Pipeline-Resource-new-url]'));
        if (!this.trigger.trigger) {
          vscode.postMessage({
            type: 'startPipeline',
            body: this.initialValue
          });
        } else {
          vscode.postMessage({
            type: 'Add Trigger',
            body: this.initialValue
          });
        }
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

  storeWorkspaceResourceName(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const workspaceResourceName = val.parentElement.children[1].children[0].value;
        const name = val.parentElement.parentElement.firstElementChild.id;
        collectWorkspaceData(name, undefined, this.initialValue, workspaceResourceName);
      })
    }
  }

  storePvcContent(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const pvcName = val.parentNode.parentElement.firstChild.textContent;
        if (val.firstChild.value.trim() === 'Create a new PVC') {
          const newWorkspaceName = val.parentNode.querySelectorAll('[id^=Webview-PVC-Name]')[0].value;
          storePvcName(pvcName, newWorkspaceName, this.initialValue);
        } else if (val.firstChild.value.trim() === 'Create a new VolumeClaimTemplate') {
          removePvcName(pvcName, this.initialValue);
        } else {
          const workspaceName = val.firstChild.value;
          storePvcName(pvcName, workspaceName, this.initialValue);
        }
      })
    }
  }

  storeNewPvcData(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const pvcName = val.querySelectorAll('[id^=Webview-PVC-Name]')[0].value;
        const accessMode = val.querySelectorAll('[id^=Access-Mode-for-Pvc]')[0].value;
        const size = val.querySelectorAll('[id^=Size-for-PVC-Storage]')[0].value;
        const inputSize = val.querySelectorAll('[id^=size-for-pvc-create-webview]')[0].value;
        createPVC(pvcName, accessMode, size, inputSize, this.initialValue);
      })
    }
  }

  storeVolumeClaimTemplate(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const resourceName = val.parentNode.parentElement.firstElementChild.id;
        const accessMode = val.querySelectorAll('[id^=Access-Mode-for-Pvc]')[0].value;
        const size = val.querySelectorAll('[id^=Size-for-PVC-Storage]')[0].value;
        const inputSize = val.querySelectorAll('[id^=size-for-pvc-create-webview]')[0].value;
        createVCT(resourceName, accessMode, size, inputSize, this.initialValue);
      })
    }
  }

  storeTriggerData(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const selectValue = val.getElementsByTagName('select')[0].value;        
        collectTriggerData(selectValue, this.initialValue, this.trigger);
      });
    }
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

  storeServiceAccountData(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        const name = val.getElementsByTagName('input')[0].value;
        collectServiceAccountData(name, this.initialValue);
      });
    }
  }

  storeNewResourceData(data: unknown[] | NodeListOf<Element>): void {
    if (data.length !== 0) {
      data.forEach(val => {
        if (val.parentElement?.['value'] === 'Create Pipeline Resource') {
          const value = val.parentElement.parentElement.parentElement.querySelector('[id^=create-new-pipeline-resource-name]').value;
          const resourceType = val.parentElement.parentElement.parentElement.parentElement.firstElementChild.innerText;
          if (resourceType === TknResourceType.GitResource) {
            createNewPipelineResource(value, 'git', this.initialValue);
          } else if (resourceType === TknResourceType.ImageResource) {
            createNewPipelineResource(value, 'image', this.initialValue);
          }
        }
      })
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
