/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { SelectWidget } from '../widgets/selectwidget';
import { EditItem } from '../widgets/maincontent';
import { volumeClaimTemplate, volumeClaimTemplateID, VolumeTypes, WorkspaceOption } from './const';
import { Trigger, PipelineStart, VCT } from './types';
import { selectText } from './util';
import { createItem } from './item';
import { InputWidget } from '../widgets/inputwidget';
import { createDivWithID } from '../../../common/dom-util';


export function triggerSelectedWorkspaceType(select: HTMLSelectElement, event: Node & ParentNode, trigger: Trigger, initialValue: PipelineStart, index?: number, pipelineRunWorkspaceVCT?: unknown): void {
  if (pipelineRunWorkspaceVCT?.[event.firstElementChild.id]) select.value = WorkspaceOption.persistentVolumeClaim;
  const sectionId = `${select.value}-Workspaces`;
  const editId = 'Workspaces-Edit';
  if (trigger[select.value]) {
    dropdownForWorkspaceType(event, editId, sectionId, select, trigger, initialValue, index, pipelineRunWorkspaceVCT);
  } else if (event.lastElementChild.firstElementChild.id.trim() === editId) {
    event.lastElementChild.remove();
  }
}


function dropdownForWorkspaceType(event: Node & ParentNode, editId: string, sectionId: string, select: HTMLSelectElement, trigger: Trigger, initialValue: PipelineStart, index?: number, pipelineRunWorkspaceVCT?: unknown): void {
  if (event.lastElementChild.firstElementChild.id.trim() === editId) event.lastElementChild.remove();
  const workspacesType = new SelectWidget(sectionId, trigger, null, initialValue).workspacesResource(trigger[select.value], select.value, index);
  const workspacesOp = new EditItem(VolumeTypes[select.value], workspacesType, editId, 'inner-editItem');
  event.appendChild(workspacesOp.getElement());
  if (VolumeTypes[select.value] === VolumeTypes.PersistentVolumeClaim) {
    selectText(event.querySelectorAll(`[id^=${sectionId}]`), `Create a new ${VolumeTypes[select.value]}`, false, 'create-new-PersistentVolumeClaim-entry');
    selectText(event.querySelectorAll(`[id^=${sectionId}]`), volumeClaimTemplate, false, volumeClaimTemplateID);
  } else {
    selectText(event.querySelectorAll(`[id^=${sectionId}]`), `Select a ${VolumeTypes[select.value]}`, (index === undefined) ?? true, 'select-workspace-option');
  }
  const pipelineRunVCT = pipelineRunWorkspaceVCT?.[event?.firstElementChild.id];
  if (pipelineRunVCT) {
    const option = event.querySelector(`[id^=${volumeClaimTemplateID}]`);
    if (option) {
      option.parentElement['value'] = volumeClaimTemplate;
      const select = event.lastElementChild.lastElementChild.getElementsByTagName('select')[0];
      createVCT(event.lastElementChild, select, initialValue, pipelineRunVCT);
    }
  }
}

export function createElementForKeyAndPath(event: Node & ParentNode, optionId: string, select: HTMLSelectElement, initialValue: PipelineStart, trigger: Trigger): void {
  const selectedItem = event.querySelectorAll('[id^=items-section-workspace-new-item]');
  const buttonItem = event.querySelectorAll('.elementButtons');
  if (selectedItem.length) {
    selectedItem.forEach((element: { remove: () => unknown }) => element.remove());
    buttonItem.forEach((element: { remove: () => unknown }) => element.remove());
    createItem(event, optionId, select.value, initialValue, trigger);
  } else {
    createItem(event, optionId, select.value, initialValue, trigger);
  }
}

export function createVCT(event: Node & ParentNode, select: HTMLSelectElement, initialValue: PipelineStart, pipelineRunVCT?: VCT): void {
  if (select[select.selectedIndex].id === 'create-new-VolumeClaimTemplate-entry') {
    const newDivClass = 'List-new-VCT-items-webview';
    createVolumeClaim(event, null, newDivClass, initialValue, pipelineRunVCT);
  }
}

export function createVolumeClaim(event: Node & ParentNode, input: EditItem, newDivClass: string, initialValue: PipelineStart, pipelineRunVCT?: VCT): void {
  let numberInput: string;
  let vctSize: string;
  const storage = pipelineRunVCT?.spec?.resources?.requests?.storage;
  const accessMode = pipelineRunVCT?.spec?.accessModes;
  if (storage) {
    numberInput = storage.match(/\d/g).join('');
    vctSize = storage.replace(/[0-9]/g, '');
  }
  const selectAccessMode = new SelectWidget('editor-select-box-item-select-a-key', null, 'editor-select-box-item', initialValue, 'Access-Mode-for-Pvc').selectAccessMode((accessMode && accessMode.length !== 0) ? accessMode[0] : null);
  const selectAccessModeOp = new EditItem('Access Mode', selectAccessMode, 'option-workspace-id', 'inner-editItem');
  const inputNumber = new EditItem('Size', new InputWidget('', 'number-input-box', initialValue, null, null, 'size-for-pvc-create-webview', null, numberInput, 'number'), 'input-resource', 'size-input-item');
  const selectSize = new SelectWidget('editor-select-box-item-select-a-key', null, 'size-select-box-item', initialValue, 'Size-for-PVC-Storage').selectSize(vctSize);
  const selectSizeOp = new EditItem('', selectSize, 'option-workspace-id', input ? (navigator.platform === 'Win32') ? 'size-select-item-windows' : 'size-select-item' : (navigator.platform === 'Win32') ? 'size-select-item-vtc-window' : 'size-select-item-vtc', null, true);
  addPVCItem(event, input, selectAccessModeOp, selectSizeOp, inputNumber, newDivClass);
}

export function addPVCItem(event: Node & ParentNode, input: EditItem, selectAccessModeOp: EditItem, selectSizeOp: EditItem, inputNumber: EditItem, newDivClass: string): void {
  event.appendChild(createDivWithID(null, newDivClass));
  if (input) event.lastChild.appendChild(input.getElement());
  event.lastChild.appendChild(selectAccessModeOp.getElement());
  event.lastChild.appendChild(inputNumber.getElement());
  event.lastChild.appendChild(selectSizeOp.getElement());
}
