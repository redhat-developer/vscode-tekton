/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import './list.css';
import { createDiv } from './dom-util';
import { BaseWidget, Listener, Widget } from './widget';

interface SizeAndPosition {
  top: number;
  width: number;
}

export abstract class ListWidget<T> extends BaseWidget {
  protected itemListChangedListener: Listener<T[]> | undefined;

  constructor(element: HTMLElement) {
    super();
    this.element = element;
  }

  show(items: T[]): void {
    this.clear();
    for (const item of items) {
      this.element.appendChild(new ItemContainer(this.createItemWidget(item)).getElement());
    }

    if (this.itemListChangedListener) {
      this.itemListChangedListener(items);
    }
  }

  showPlaceholder(label: string): void {
    this.clear();
    const message = createDiv('message-container');
    message.textContent = label;
    this.element.appendChild(message);
  }

  addItemListChangedListener(listener: Listener<T[]>): void {
    this.itemListChangedListener = listener;
  }
  
  abstract createItemWidget(item: T): Widget;
}

export interface CollapsibleListState {
  [key: string]: boolean;
}

export class CollapsibleList<T> extends BaseWidget {

  private items = new Map<SplitView, Collapsible>();

  constructor(element: HTMLElement, private stateListener?: Listener<CollapsibleListState>, private state?: CollapsibleListState) {
    super();
    this.element = element;
  }

  addSubList(title: string, subList: ListWidget<T>): void {
    const collapsible = new Collapsible(title, subList.getElement().childNodes.length, subList);
    if (this.state){
      const collapsed = this.state[title] ?? false;
      if (collapsed) {
        collapsible.expand();
      } else {
        collapsible.collapse();
      }
    }
    const splitView = new SplitView();
    splitView.addWidget(collapsible);
    this.element.appendChild(splitView.getElement());

    this.items.set(splitView, collapsible);
    collapsible.onCollapsedStateChanged(() => {
      this.updateLayout();
      if (this.stateListener){
        this.state[title] = collapsible.isCollapsed;
        this.stateListener(this.state);
      }
    });

    subList.addItemListChangedListener((items) => {
      collapsible.setBadgeText(items.length.toString());
    });

    this.updateLayout();
  }

  updateLayout(): void {
    setTimeout(()=> {
      let top = 0;
      let height = this.element.clientHeight;
      let collapsedNum = 0;
      for (const c of this.items.values()) {
        if (c.isCollapsed) {
          collapsedNum ++;
        }
      }
      let notCollapsedHeight = 0;
      if (collapsedNum !== this.items.size){
        notCollapsedHeight = (height - (collapsedNum * 22)) / (this.items.size - collapsedNum) ;
      }

      height = 22;
      for (const [w, c] of this.items.entries()) {
        w.getElement().style.top = `${top}px`;
        if (c.isCollapsed) {
          top += 22;
          w.getElement().style.height = `${height}px`;
        } else {
          top += notCollapsedHeight;
          w.getElement().style.height = `${notCollapsedHeight}px`;
        }
      }

    }, 30);
  } 
}

class SplitView extends BaseWidget {
  constructor() {
    super();
    this.element = createDiv('split-view');
  }

  addWidget(widget: Widget): void {
    this.element.appendChild(widget.getElement());
  }

}
class Collapsible extends BaseWidget {
  private header: HTMLElement;
  private body: HTMLElement;
  private twisty: HTMLElement;
  private badgeElement: HTMLElement;

  isCollapsed = false;

  private collapsedStateListener: Listener<boolean>;

  constructor(title: string, badge: number | undefined, child: Widget) {
    super();
    this.element = createDiv('collapsible');
    this.header = createDiv('collapsible-header');
    this.body = createDiv('collapsible-body');

    this.createHeader(title, badge);
    this.createBody(child);
  }

  onCollapsedStateChanged(listener: Listener<boolean>): void {
    this.collapsedStateListener = listener;
  }

  setBadgeText(text: string): void {
    this.badgeElement.textContent = text;
  }

  private createHeader(title: string, badge?: number): void {
    this.twisty = createDiv('codicon', 'codicon-view-pane-container-expanded');
    this.header.appendChild(this.twisty);

    const titleElement = document.createElement('h3');
    titleElement.className = 'title';
    titleElement.textContent = title;
    this.header.appendChild(titleElement);
    const badgeWrapper = createDiv('count-badge-wrapper');

    this.badgeElement = createDiv('monaco-count-badge');
    badgeWrapper.appendChild(this.badgeElement);
    this.badgeElement.textContent = badge.toString();

    this.header.appendChild(badgeWrapper);

    this.element.appendChild(this.header);
    this.header.onclick = () => {
      this.handleClick();
    };

    this.header.tabIndex = 0;
    this.header.onfocus = () => {
      this.header.classList.add('focused');
    };

    this.header.onblur = () => {
      this.header.classList.remove('focused');
    }
  }

  private createBody(child: Widget): void {
    this.body.appendChild(child.getElement());
    this.element.appendChild(this.body);
  }

  private handleClick(): void {
    if (this.isCollapsed){
      this.collapse()
    } else {
      this.expand();
    }

    if (this.collapsedStateListener){
      this.collapsedStateListener(this.isCollapsed);
    }
  }

  collapse(): void {
    this.element.classList.add('animated');
    this.twisty.classList.remove('codicon-view-pane-container-collapsed');
    this.twisty.classList.add('codicon-view-pane-container-expanded');
    this.body.style.display = 'block';
    this.isCollapsed = false;
  }

  expand(): void {
    this.element.classList.add('animated');
    this.twisty.classList.remove('codicon-view-pane-container-expanded');
    this.twisty.classList.add('codicon-view-pane-container-collapsed');
    this.body.style.display = 'none';
    this.isCollapsed = true;
  }
}


class ItemContainer extends BaseWidget {
  constructor(item: Widget) {
    super()
    this.element = createDiv('list-item');
    this.element.appendChild(item.getElement());
  }
}
