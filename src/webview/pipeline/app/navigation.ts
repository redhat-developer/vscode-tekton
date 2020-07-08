/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from './util';
import { BaseWidget, Listener } from './widget';

export class NavigationItem extends BaseWidget {
  constructor(name: string) {
    super();
    this.element = createDiv('navigationItem');
    this.element.innerText = name;
    this.element.title = name;
  }

  setSelected(): void {
    this.element.classList.add('navigationItem-selected');
  }

  removeSelection(): void {
    this.element.classList.remove('navigationItem-selected');
  }
}

export class NavigationList extends BaseWidget {

  private selectedItem: NavigationItem;

  private selectionListener: Listener<NavigationItem>;

  constructor() {
    super();
    this.element = document.createElement('div');
    this.element.className = 'navigation';
  }

  addItem(item: NavigationItem): void {
    this.element.appendChild(item.getElement());
    item.getElement().onclick = (() => {
      this.selectItem(item);
      if (this.selectionListener) {
        this.selectionListener(item);
      }
    });
  }

  selectItem(item: NavigationItem): void {
    if (this.selectedItem == item) {
      return;
    }

    if (this.selectedItem) {
      this.selectedItem.removeSelection();
    }
    item.setSelected();
    this.selectedItem = item;
  }

  setSelectionListener(listener: Listener<NavigationItem>): void {
    this.selectionListener = listener;
  }
}
