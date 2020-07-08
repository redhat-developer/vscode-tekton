/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from './util';
import { Trigger, NameType } from './types';
import { NavigationList, NavigationItem } from './navigation';
import { BaseWidget, Widget } from './widget';
import { Editor, GroupItem, EditItem } from './maincontent';
import { VolumeTypes } from './const';

export class InputWidget extends BaseWidget {
  constructor(text?: string) {
    super();
    const editorInput = createDiv('editor-input-box');
    const input = document.createElement('input');
    input.classList.add('input');
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = text ?? '';
    input.type = text;
    this.element = editorInput;
    const wrapper = createDiv('wrapper');
    wrapper.appendChild(input);
    editorInput.appendChild(wrapper);
  }
}

export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor() {
    super();
    this.element = createDiv('select-container');
    this.select = document.createElement('select');
    this.select.classList.add('editor-select-box');
    this.element.appendChild(this.select);
  }

  pipelineResource(items: string[], resource: NameType): Widget {
    items.forEach(val => {
      if (val['spec'].type === resource.type) {
        const op = document.createElement('option');
        op.value = val['metadata'].name;
        op.text = val['metadata'].name;
        this.select.appendChild(op);
      }
    });
    return this;
  }

  workspaces(type: unknown): Widget {
    Object.keys(type).forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      this.select.appendChild(op);
    })
    return this;
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
        parametersGroup.addEditItem(new EditItem(param.name, new InputWidget('Name')));
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
        resourcesGroup.addEditItem(new EditItem(resource.name, new SelectWidget().pipelineResource(this.trigger.pipelineResource, resource)));
        //TODO: complete this
      }
      this.editor.addGroup(resourcesGroup);
      const navigationItem = new NavigationItem('Resources');
      this.navigation.addItem(navigationItem);
      this.navigationToGroupMap.set(navigationItem, resourcesGroup);
    }

    if (this.trigger.workspaces) {
      const resourcesGroup = new GroupItem('Workspaces');
      for (const workspace of this.trigger.workspaces) {
        resourcesGroup.addEditItem(new EditItem(workspace.name, new SelectWidget().workspaces(VolumeTypes)));
        //TODO: complete this
      }
      this.editor.addGroup(resourcesGroup);
      const navigationItem = new NavigationItem('Workspaces');
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
