/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { SelectWidget } from '../element/selectwidget';
import { EditItem } from '../element/maincontent';
import { createDiv } from '../utils/util';
import { InputWidget } from '../element/inputwidget';
import { ButtonsPanel } from '../element/buttonspanel';
import { PipelineStart, Trigger } from './types';
import { disableButton } from '..';

export function disableRemoveButton(event: Node & ParentNode): void {
  const selectedItem = event.querySelectorAll('[id^=items-section-workspace-new-item]');
  if (selectedItem.length === 1) {
    selectedItem[0].lastElementChild.firstElementChild.className = 'close-button-disable';
  } else {
    selectedItem[0].lastElementChild.firstElementChild.className = 'close-button';
  }
}

export function createItem(event: Node & ParentNode, optionId: string, selectValue?: string, initialValue?: PipelineStart, trigger?: Trigger): void {
  const newDivClass = 'items-section-workspace-new-item';
  const selectItem = new SelectWidget(null, null, 'editor-select-box-item', initialValue).selectItem(trigger[optionId], selectValue);
  const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
  if (event.lastElementChild.id === 'Add-New-Items') event.lastChild.remove();
  event.appendChild(createDiv(null, newDivClass));
  event.lastChild.appendChild(selectItemOp.getElement());
  event.lastChild.appendChild(new InputWidget('Enter a path', null, initialValue).getElement());
  event.lastChild.appendChild(new ButtonsPanel(null, 'close-button-div', 'close-button', null, null, null, null, initialValue).getElement());
  event.appendChild(new ButtonsPanel('Add items', 'elementButtons', 'addItemButtons', trigger, optionId, selectValue, 'Add-New-Items', initialValue).getElement());
  disableRemoveButton(event);
  disableButton(document.getElementsByTagName('input'));
}
