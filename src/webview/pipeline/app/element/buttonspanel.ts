/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from '../common/widget';
import { Trigger, PipelineStart } from '../common/types';
import { SelectWidget } from './selectwidget';
import { EditItem } from './maincontent';
import { createDiv } from '../utils/util';
import { InputWidget } from './inputwidget';
import { createItem } from '../common/item';

export class ButtonsPanel extends BaseWidget {
  private startButton: HTMLElement;

  constructor(
    textContent?: string,
    className?: string,
    buttonClassName?: string,
    public trigger?: Trigger,
    public optionId?: string,
    public selectOption?: string,
    elementType?: string,
    id?: string,
    public initialValue?: PipelineStart
  ) {
    super();
    this.element = document.createElement('div');
    this.element.className = className ?? '';
    this.startButton = document.createElement(elementType ?? 'button');
    this.startButton.textContent = textContent ?? '';
    this.startButton.id = id ?? '';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = buttonClassName ?? '';
    this.startButton.onclick = () => this.addItem(this.startButton.parentNode.parentNode);
    this.element.id = id ?? '';
    this.element.appendChild(this.startButton);
  }

  addItem(event: Node & ParentNode): void {
    if (event.lastChild.parentElement.id === 'items-section-workspace') event.lastChild.parentElement.remove();
    if (this.optionId) {
      createItem(event, this.optionId, this.selectOption, this.initialValue, this.trigger);
    }
  }
}
