/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from './util';
import { PipelineStart, Trigger } from './types';
import { disableButton, selectText } from '../index';
import { SelectWidget } from '../widgets/selectwidget';
import { EditItem } from '../widgets/maincontent';
import { InputWidget } from '../widgets/inputwidget';
import { ButtonsPanel } from '../widgets/buttonspanel';
import { disableRemoveButton, disableSelection } from './disablebutton';

export function createItem(event: Node & ParentNode, optionId: string, selectValue?: string, initialValue?: PipelineStart, trigger?: Trigger): void {
  const newDivClass = 'items-section-workspace-new-item';
  const selectItem = new SelectWidget('editor-select-box-item-select-a-key', null, 'editor-select-box-item', initialValue).selectItem(trigger[optionId], selectValue);
  const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
  addItem(event, optionId, newDivClass, selectItemOp, selectValue, initialValue, trigger);
}

export function addItem(event: Node & ParentNode, optionId: string, newDivClass: string, selectItemOp: EditItem, selectValue: string, initialValue: PipelineStart, trigger: Trigger): void {
  if (event.lastElementChild.id === 'Add-New-Items') event.lastChild.remove();
  event.appendChild(createDiv(null, newDivClass));
  event.lastChild.appendChild(selectItemOp.getElement());
  event.lastChild.appendChild(new InputWidget('Enter a path', 'editor-input-box-disable', initialValue, true, 'enable-input-box-workspace', 'disabled', 'disabled').getElement());
  event.lastChild.appendChild(new ButtonsPanel(null, 'close-button-div', 'close-button', null, null, null, null, initialValue).getElement());
  event.appendChild(new ButtonsPanel('Add items', 'elementButtons', 'addItemButtons', trigger, optionId, selectValue, 'Add-New-Items', initialValue).getElement());
  selectText(selectItemOp.getElement().querySelectorAll('[id^=editor-select-box-item-select-a-key]'), 'Select a key', true);
  disableRemoveButton(event);
  disableSelection(document.getElementsByTagName('select'));
  disableButton(document.getElementsByTagName('input'));
}
