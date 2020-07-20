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
  private startButton: HTMLElement;

  constructor(textContent?: string,
    className?: string,
    buttonClassName?: string,
    public trigger?: Trigger,
    public optionId?: string,
    public selectOption?: string,
    elementType?: string
  ) {
    super();
    this.element = document.createElement('div');
    this.element.className = className ?? '';

    this.startButton = document.createElement(elementType ?? 'button');
    this.startButton.textContent = textContent ?? '';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = buttonClassName ?? '';
    this.startButton.onclick = () => this.addItem(this.startButton.parentNode.parentNode);
    this.element.appendChild(this.startButton);
  }

  addItem(event: Node & ParentNode): void {
    console.log('kljkjlksjdkljdfjdlkjfsdlsdfjkljsdfklfjdskl');
    if (event.lastChild.parentElement.id === 'items-section-workspace') event.lastChild.parentElement.remove();
    if (this.optionId) {
      this.createItem(event, this.optionId, this.selectOption);
    }
  }

  createItem(event: Node & ParentNode, optionId: string, selectValue?: string): void {
    const newDivClass = 'items-section-workspace';
    const selectItem = new SelectWidget(null, null, 'editor-select-box-item').selectItem(this.trigger[optionId], selectValue);
    const selectItemOp = new EditItem('Items', selectItem, 'option-workspace-id', 'inner-editItem');
    event.lastChild.remove();
    event.appendChild(createDiv(newDivClass, newDivClass));
    event.lastChild.appendChild(selectItemOp.getElement());
    event.lastChild.appendChild(new InputWidget('Enter a path').getElement());
    event.lastChild.appendChild(new ButtonsPanel(null, 'close-button-div', 'close-button', null, null, null, 'a').getElement());
    event.appendChild(new ButtonsPanel('Add items', 'elementButtons', 'addItemButtons', this.trigger, optionId, selectValue).getElement());
  }
}
