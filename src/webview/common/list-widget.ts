/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import './list.css';
import { createDiv } from './dom-util';
import { BaseWidget, Widget } from './widget';

export abstract class ListWidget<T> extends BaseWidget {
  constructor(element: HTMLElement) {
    super();
    this.element = element;
  }

  clear(): void {
    if (this.element){
      this.element.innerHTML = '';
    }
  }

  show(items: T[]): void {
    this.clear();
    for (const item of items) {
      this.element.appendChild(new ItemContainer(this.createItemWidget(item)).getElement());
    }
  }

  showPlaceholder(label: string): void {
    this.clear();
    const message = createDiv('message-container');
    message.textContent = label;
    this.element.appendChild(message);
  }
  
  abstract createItemWidget(item: T): Widget;
}


class ItemContainer extends BaseWidget {
  constructor(item: Widget) {
    super()
    this.element = createDiv('list-item');
    this.element.appendChild(item.getElement());
  }
}
