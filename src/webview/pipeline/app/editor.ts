/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Trigger, Params, Workspaces, PipelineStart, NameType, PipelineRunWorkspaces } from './utils/types';
import { NavigationList, NavigationItem } from './widgets/navigation';
import { Widget } from '../../common/widget';
import { VolumeTypes, initialResourceFormValues, TknResourceType, typeOfResource } from './utils/const';
import { ButtonsPanel } from './widgets/buttonspanel';
import { Editor, GroupItem, EditItem } from './widgets/maincontent';
import { InputWidget } from './widgets/inputwidget';
import { SelectWidget } from './widgets/selectwidget';
import { createDivWithID, createSpan } from '../../common/dom-util';

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
    this.buttonsPanel = new ButtonsPanel(!this.trigger.trigger ? 'start' : 'Add', 'buttons', 'startButton', this.trigger, null, null, null, this.initialValue);

    this.element.appendChild(this.navigation.getElement());
    this.element.appendChild(this.editor.getElement());
    this.element.appendChild(this.buttonsPanel.getElement());
    this.navigation.setSelectionListener(this.onNavigationSelectChange.bind(this));
    this.editor.addSelectionListener(this.onEditorSelectionChange.bind(this));
    this.update();
  }

  createElement(title: string, resourceType?: Params[] | PipelineRunWorkspaces[] | Workspaces[], serviceAccount?: string): void {
    const resourceGroup = new GroupItem(title, `${title}-vscode-webview-pipeline`);
    this.initialValue.name = this.trigger.name;
    if (this.trigger.startTask) this.initialValue.startTask = true;
    if (this.trigger.startClusterTask) this.initialValue.startClusterTask = true;
    if (this.trigger.commandId) this.initialValue.commandId = this.trigger.commandId;
    let element: Widget;
    let elementId: string;
    if (resourceType) {
      for (const resource of resourceType) {
        if (title === TknResourceType.Trigger) {
          elementId = `${TknResourceType.Trigger}-add-trigger-webhook`;
          element = new SelectWidget('Add-Trigger-WebHook', null, null, this.initialValue).triggerOption(this.trigger.trigger);
        } else if (title === TknResourceType.Params) {
          elementId = `${TknResourceType.Params}-input-field-content-data`;
          element = new InputWidget('Name', null, this.initialValue, null, null, null, null, resource['default']);
          if (resource['description']) {
            const createNewDiv = createDivWithID('Description-Param', 'Description-Param');
            const description = createSpan('description');
            description.innerText = `Description: ${resource['description']}`
            createNewDiv.appendChild(description)
            element.getElement().appendChild(createNewDiv);
          }
        } else if (title === TknResourceType.Workspaces) {
          element = new SelectWidget('Workspaces-volume', this.trigger, null, this.initialValue).workspaces(VolumeTypes, resource);
        } else if (title === TknResourceType.GitResource || title === TknResourceType.ImageResource) {
          element = new SelectWidget('Resources', null, null, this.initialValue).pipelineResource(this.trigger.pipelineResource, resource, this.trigger.startTask || this.trigger.startClusterTask);
        }
        resourceGroup.addEditItem(new EditItem(resource.name, element, resource.name, null, elementId));
        //TODO: complete this
      }
    } else {
      if (title === TknResourceType.ServiceAccountName) {
        elementId = 'Service-account-name-input-field-content-data';
        element = new InputWidget('Name', null, this.initialValue, null, null, null, null, serviceAccount ?? 'default');
        resourceGroup.addEditItem(new EditItem('serviceAccountName', element, 'serviceAccountName', null, elementId));
      }
    }
    this.editor.addGroup(resourceGroup);
    const navigationItem = new NavigationItem(title);
    this.navigation.addItem(navigationItem);
    this.navigationToGroupMap.set(navigationItem, resourceGroup);
  }

  private update(): void {

    if (this.trigger.trigger) {
      this.createElement(TknResourceType.Trigger, this.trigger.triggerLabel);
    }

    if (this.trigger.params) {
      this.createElement(TknResourceType.Params, this.trigger.params);
    }

    const gitResource = [];
    const imageResource = [];

    if (this.trigger.resources) {
      this.startPipeline(gitResource, imageResource);
    }
    if (this.trigger.workspaces) {
      this.createElement(TknResourceType.Workspaces, this.trigger.workspaces);
    }
    if (this.trigger.serviceAccount === 'Start-Pipeline') {
      this.createElement(TknResourceType.ServiceAccountName);
    }
    if (this.trigger.pipelineRun) {
      this.startPipelineRun();
    }
  }

  startPipelineRun(): void {
    this.paramPipelineRun();
    this.resourcePipelineRun();
    this.workspacePipelineRun();
    this.serviceAccountPipelineRun();
  }

  serviceAccountPipelineRun(): void {
    if (!this.trigger.serviceAccount) {
      this.createElement(TknResourceType.ServiceAccountName, null, this.trigger.pipelineRun.serviceAccount);
    }
  }

  paramPipelineRun(): void {
    if (this.trigger.pipelineRun.params && this.trigger.pipelineRun.params.length !== 0) {
      this.trigger.pipelineRun.params.forEach(val => {
        if (val.value) {
          val.default = val.value;
        }
      });
      this.createElement(TknResourceType.Params, this.trigger.pipelineRun.params);
    }
  }

  resourcePipelineRun(): void {
    const gitResource = [];
    const imageResource = [];
    const pipelineRunResourceRef = {};
    if (this.trigger.pipelineRun.resources) {
      this.trigger.pipelineRun.resources.forEach(val => {
        try {
          pipelineRunResourceRef[val.resourceRef.name] = {
            resource: val.name
          };
        } catch (err) {
          if (val.type === typeOfResource.git) {
            gitResource.push(val);
          } else if (val.type === typeOfResource.image) {
            imageResource.push(val);
          }
        }
      });
      this.trigger.pipelineResource.forEach(val => {
        if (pipelineRunResourceRef[val.metadata.name]) {
          if (val.spec.type === typeOfResource.git) {
            gitResource.push({name: pipelineRunResourceRef[val.metadata.name].resource, type: val.spec.type, resourceRef: {name: val.metadata.name}});
          } else if (val.spec.type === typeOfResource.image) {
            imageResource.push({name: pipelineRunResourceRef[val.metadata.name].resource, type: val.spec.type, resourceRef: {name: val.metadata.name}});
          }
        }
      });
      if (gitResource && gitResource.length !== 0) {
        this.createElement(TknResourceType.GitResource, gitResource);
      }

      if (imageResource && imageResource.length !== 0) {
        this.createElement(TknResourceType.ImageResource, imageResource);
      }
    }
  }

  workspacePipelineRun(): void {
    if (this.trigger.pipelineRun.workspaces && this.trigger.pipelineRun.workspaces.length !== 0) {
      this.createElement(TknResourceType.Workspaces, this.trigger.pipelineRun.workspaces);
    }
  }

  startPipeline(gitResource: NameType[], imageResource: NameType[]): void {
    if (this.trigger.resources && this.trigger.resources.length !== 0) {
      this.trigger.resources.filter(val => {
        if (val.type === typeOfResource.git) {
          gitResource.push(val);
        } else if (val.type === typeOfResource.image) {
          imageResource.push(val)
        }
      });
      if (gitResource && gitResource.length !== 0) {
        this.createElement(TknResourceType.GitResource, gitResource);
      }
      if (imageResource && imageResource.length !== 0) {
        this.createElement(TknResourceType.ImageResource, imageResource);
      }
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
