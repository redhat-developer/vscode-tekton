/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from './util';
import { Trigger } from './types';
import { debounce } from 'debounce';

export interface Widget {
  getElement(): HTMLElement;
}
export class BaseWidget implements Widget {
  protected element: HTMLElement;

  getElement(): HTMLElement {
    return this.element;
  }
}

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

export type Listener<T> = (item: T) => void;

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

export class GroupItem extends BaseWidget {

  constructor(private title: string) {
    super();
    this.element = createDiv('editorGroup');
    this.element.innerText = title;
  }

  addEditItem(item: EditItem): void {
    this.element.appendChild(item.getElement());
  }

  getName(): string {
    return this.title;
  }

}

export class LabelItem extends BaseWidget {
  constructor(title: string) {
    super();
    this.element = createDiv('editorLabel');
    this.element.innerText = title;
  }
}

export class InputWidget extends BaseWidget {
  constructor() {
    super();
    const editorInput = createDiv('editor-input-box');
    const input = document.createElement('input');
    input.classList.add('input');
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.type = 'text';
    this.element = editorInput;
    const wrapper = createDiv('wrapper');
    wrapper.appendChild(input);
    editorInput.appendChild(wrapper);
  }
}

export class SelectWidget extends BaseWidget {
  constructor(items: string[]) {
    super();
    this.element = createDiv('select-container');
    const select = document.createElement('select');
    select.classList.add('editor-select-box');
    this.element.appendChild(select);
    items.forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      select.appendChild(op);
    });
  }
}

export class EditItem extends BaseWidget {

  constructor(title: string, input: Widget) {
    super();
    this.element = createDiv('editItem');
    this.element.appendChild(new LabelItem(title).getElement());
    this.element.appendChild(input.getElement());
  }
}

export class Editor extends BaseWidget {

  private selectedGroup: GroupItem;

  private children: GroupItem[] = [];
  private selectionListener: Listener<GroupItem>;

  private update = debounce(this.updateSelection.bind(this), 10);

  constructor() {
    super();
    this.element = document.createElement('div');
    this.element.className = 'main';
    this.element.onscroll = () => {
      this.update();
    };
  }

  addGroup(group: GroupItem): void {
    this.children.push(group);
    this.element.appendChild(group.getElement());
    this.update();
  }

  updateSelection(): void {
    let h = 0;
    let selected: GroupItem;
    for (const child of this.children) {
      const el = child.getElement();
      h += el.offsetHeight;
      if (h === 0 && this.element.scrollTop === 0) {
        selected = child;
        break;
      }
      if (h >= this.element.scrollTop + 40) {
        selected = child;
        break;
      }
    }

    if (selected && this.selectedGroup !== selected) {
      this.selectedGroup = selected;
      if (this.selectionListener) {
        this.selectionListener(selected);
      }
    }
  }

  addSelectionListener(listener: Listener<GroupItem>): void {
    this.selectionListener = listener;
  }
}

export class ButtonsPanel extends BaseWidget {

  private startButton: HTMLAnchorElement;

  constructor() {
    super();
    this.element = document.createElement('div');
    this.element.className = 'buttons';

    this.startButton = document.createElement('a');
    this.startButton.textContent = 'Start';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = 'startButton';
    this.element.appendChild(this.startButton);

  }


}

export class PipelineRunEditor implements Widget {
  private element: HTMLElement;
  private buttonsPanel: ButtonsPanel;
  private editor: Editor;
  private navigation: NavigationList;

  private navigationToGroupMap = new Map<NavigationItem, GroupItem>();

  constructor(private trigger: Trigger) {

    this.element = document.createElement('div');
    this.element.className = 'grid-container';

    this.navigation = new NavigationList();
    this.editor = new Editor();

    this.buttonsPanel = new ButtonsPanel();


    this.element.appendChild(this.navigation.getElement());
    this.element.appendChild(this.editor.getElement());
    this.element.appendChild(this.buttonsPanel.getElement());
    this.navigation.setSelectionListener(this.onNavigationSelectChange.bind(this));
    this.editor.addSelectionListener(this.onEditorSelectionChange.bind(this));
    this.update();
  }

  private update(): void {

    if (this.trigger.params) {
      const parametersGroup = new GroupItem('Parameters');
      for (const param of this.trigger.params) {
        parametersGroup.addEditItem(new EditItem(param.name, new InputWidget()));
        //TODO: complete this
      }
      this.editor.addGroup(parametersGroup);
      const navigationItem = new NavigationItem('Parameters');
      this.navigation.addItem(navigationItem);
      this.navigationToGroupMap.set(navigationItem, parametersGroup);
    }

    if (this.trigger.resources) {
      const resourcesGroup = new GroupItem('Resources');
      for (const resource of this.trigger.resources) {
        resourcesGroup.addEditItem(new EditItem(resource.name, new InputWidget()));
        //TODO: complete this
      }
      this.editor.addGroup(resourcesGroup);
      const navigationItem = new NavigationItem('Resources');
      this.navigation.addItem(navigationItem);
      this.navigationToGroupMap.set(navigationItem, resourcesGroup);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private onNavigationSelectChange(item: NavigationItem): void {
    if (this.navigationToGroupMap.has(item)) {
      const group = this.navigationToGroupMap.get(item);
      group.getElement().scrollIntoView()
    }
  }

  private onEditorSelectionChange(item: GroupItem): void {
    for (const [nav, group] of this.navigationToGroupMap) {
      if (group === item) {
        this.navigation.selectItem(nav);
      }
    }
  }
}
