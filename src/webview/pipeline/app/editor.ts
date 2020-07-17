/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Trigger, Params, Workspaces, PipelineStart } from './common/types';
import { NavigationList, NavigationItem } from './utils/navigation';
import { Widget } from './common/widget';
import { Editor, GroupItem, EditItem } from './element/maincontent';
import { VolumeTypes, initialResourceFormValues } from './utils/const';
import { ButtonsPanel } from './element/buttonspanel';
import { SelectWidget } from './element/selectwidget';
import { InputWidget } from './element/inputwidget';

export class PipelineRunEditor implements Widget {
  private element: HTMLElement;
  private buttonsPanel: ButtonsPanel;
  private editor: Editor;
  private navigation: NavigationList;
  public initialValue: PipelineStart = initialResourceFormValues;

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

  createElement(title: string, resourceType: Params[] | Workspaces[]): void {
    const resourceGroup = new GroupItem(title);
    for (const resource of resourceType) {
      let element: Widget;
      if (title === 'Parameters') {
        element = new InputWidget('Name', null, this.initialValue);
      } else if (title === 'Workspaces') {
        element = new SelectWidget('Workspaces-volume', this.trigger).workspaces(VolumeTypes)
      } else {
        element = new SelectWidget('Resources').pipelineResource(this.trigger.pipelineResource, resource);
      }
      resourceGroup.addEditItem(new EditItem(resource.name, element, resource.name));
      //TODO: complete this
    }
    this.editor.addGroup(resourceGroup);
    const navigationItem = new NavigationItem(title);
    this.navigation.addItem(navigationItem);
    this.navigationToGroupMap.set(navigationItem, resourceGroup);
  }

  private update(): void {

    if (this.trigger.params) {
      this.createElement('Parameters', this.trigger.params);
    }

    const gitResource = [];
    const imageResource = [];

    if (this.trigger.resources) {
      this.trigger.resources.filter(val => {
        if (val.type === 'git') {
          gitResource.push(val);
        } else if (val.type === 'image') {
          imageResource.push(val)
        }
      });
      if (gitResource.length !== 0) {
        this.createElement('Git Resource', gitResource);
      }

      if (imageResource.length !== 0) {
        this.createElement('Image Resource', imageResource);
      }
    }

    if (this.trigger.workspaces) {
      this.createElement('Workspaces', this.trigger.workspaces);
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
