/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from '../common/widget';
import { Trigger } from '../common/types';
import { SelectWidget } from './selectwidget';
import { EditItem } from './maincontent';
import { createDiv } from '../utils/util';
import { InputWidget } from './inputwidget';

export class ButtonsPanel extends BaseWidget {
  private startButton: HTMLAnchorElement;

  constructor(textContent?: string, className?: string, buttonClassName?: string, public trigger?: Trigger, public optionId?: string, public selectOption?: string) {
    super();
    this.element = document.createElement('div');
    this.element.className = className ?? 'buttons';

    this.startButton = document.createElement('a');
    this.startButton.textContent = textContent ?? 'Start';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = buttonClassName ?? 'startButton';
    this.startButton.onclick = () => this.addItem(this.startButton.parentNode.parentNode);
    this.element.appendChild(this.startButton);
  }

  addItem(event: Node & ParentNode): void {
    if (this.optionId) {
      this.createItem(event, this.optionId, this.selectOption);
    }
  }

  createItem(event: Node & ParentNode, optionId: string, selectValue?: string): void {
    const newDivClass = 'items-section-workspace';
    const selectItem = new SelectWidget(null, null, 'editor-select-box-item').selectItem(this.trigger[optionId], selectValue);
    const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
    event.lastChild.remove();
    event.appendChild(createDiv(newDivClass));
    event.lastChild.appendChild(selectItemOp.getElement());
    event.lastChild.appendChild(new InputWidget('Enter a path').getElement());
    event.appendChild(new ButtonsPanel('Add items', 'elementButtons', 'addItemButtons', this.trigger, optionId, selectValue).getElement());
  }
}
