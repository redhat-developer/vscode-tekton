/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { selectText } from './util';
import { createDiv } from '../../../common/dom-util';
import { PipelineStart, Trigger, Item } from './types';
import { SelectWidget } from '../widgets/selectwidget';
import { EditItem } from '../widgets/maincontent';
import { InputWidget } from '../widgets/inputwidget';
import { ButtonsPanel } from '../widgets/buttonspanel';
import { disableRemoveButton, blockStartButton } from './disablebutton';

export function createItem(event: Node & ParentNode, optionId: string, selectValue?: string, initialValue?: PipelineStart, trigger?: Trigger, item?: Item): void {
  const newDivClass = 'items-section-workspace-new-item';
  const selectItem = new SelectWidget('editor-select-box-item-select-a-key', null, 'editor-select-box-item', initialValue).selectItem(trigger[optionId], selectValue, item);
  const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
  addItem(event, optionId, newDivClass, selectItemOp, selectValue, initialValue, trigger, item);
}

export function addItem(event: Node & ParentNode, optionId: string, newDivClass: string, selectItemOp: EditItem, selectValue: string, initialValue: PipelineStart, trigger: Trigger, item?: Item): void {
  if (event.lastElementChild.id === 'Add-New-Items') event.lastChild.remove();
  event.appendChild(createDiv(null, newDivClass));
  event.lastChild.appendChild(selectItemOp.getElement());
  event.lastChild.appendChild(new InputWidget('Enter a path', item ? null : 'editor-input-box-disable', initialValue, item ? false : true, 'enable-input-box-workspace', item ? null : 'disabled', item ? null : 'disabled', item ? item.path : null).getElement());
  event.lastChild.appendChild(new ButtonsPanel(null, 'close-button-div', 'close-button', null, null, null, null, initialValue).getElement());
  event.appendChild(new ButtonsPanel('Add items', 'elementButtons', 'addItemButtons', trigger, optionId, selectValue, 'Add-New-Items', initialValue).getElement());
  if (!item) selectText(selectItemOp.getElement().querySelectorAll('[id^=editor-select-box-item-select-a-key]'), 'Select a key', true);
  disableRemoveButton(event);
  if (!item) blockStartButton();
}
