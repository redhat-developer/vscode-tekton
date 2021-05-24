/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import './style.css';
import 'vscode-codicons/dist/codicon.ttf'
import { PipelineRunEditor } from './editor';
import { Trigger, PipelineStart } from './utils/types';
import { selectText } from './utils/util';
import { initialResourceFormValues, workspaceResource } from './utils/const';
import { triggerSelectedWorkspaceType } from './utils/displayworkspaceresource';
import { createItem } from './utils/item';
import { blockStartButton } from './utils/disablebutton';
import { EditItem } from './widgets/maincontent';
import { InputWidget } from './widgets/inputwidget';

declare const acquireVsCodeApi: () => ({ getState(): Trigger; setState(data: Trigger): void; postMessage: (msg: unknown) => void });
export const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'trigger':
      rootElement.appendChild(new PipelineRunEditor(event.data.data).getElement());
      selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource', null, 'Create-Pipeline-Resource-new-url');
      displayWorkspaceContent(document.querySelectorAll('[id^=Workspaces-volume]'), event.data.data);
      selectText(document.querySelectorAll('[id^=Add-Trigger-WebHook]'), 'Select Git Provider Type', true);
      createPipelineResource(document.querySelectorAll('[id^=Create-Pipeline-Resource-new-url]'));
      blockStartButton();
      vscode.setState(event.data.data); // TODO: fix this, store real state
      break;
  }
}, false);

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}

function createPipelineResource(event: NodeListOf<Element>): void {
  if (event) {
    event.forEach((val) => {
      if (val.parentElement?.['value'] === 'Create Pipeline Resource') {
        const initialValue: PipelineStart = initialResourceFormValues;
        const event = val.parentElement.parentElement.parentElement;
        const input = new EditItem('URL', new InputWidget('Please provide Name/URL', null, initialValue, null, null, 'create-new-pipeline-resource-name'), 'input-resource', 'inner-editItem');
        event.appendChild(input.getElement());
      }
    });
  }
}

function restore(state: Trigger): void {
  rootElement.appendChild(new PipelineRunEditor(state).getElement());
  selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource', null, 'Create-Pipeline-Resource-new-url');
  displayWorkspaceContent(document.querySelectorAll('[id^=Workspaces-volume]'), state);
  selectText(document.querySelectorAll('[id^=Add-Trigger-WebHook]'), 'Select Git Provider Type', true);
  createPipelineResource(document.querySelectorAll('[id^=Create-Pipeline-Resource-new-url]'));
  blockStartButton();
}

function displayWorkspaceContent(event: NodeListOf<Element>, trigger: Trigger): void {
  const initialValue: PipelineStart = initialResourceFormValues;
  if (event) {
    event.forEach((val, index) => {
      triggerSelectedWorkspaceType(val.getElementsByTagName('select')[0], val.parentNode, trigger, initialValue, index);
      try {
        const selectedWorkspaceValue = val.getElementsByTagName('select')[0].value;
        const selectedWorkspaceItem = document.querySelectorAll(`[id^=${selectedWorkspaceValue}-Workspaces]`)[0];
        const valueWorkspaceItem = selectedWorkspaceItem.getElementsByTagName('select')[0].value;
        const objectWorkspace = trigger.pipelineRun.workspaces[index];
        const items = objectWorkspace[workspaceResource[selectedWorkspaceValue]].items;
        if (items) {
          items.map(val => {
            createItem(selectedWorkspaceItem.parentNode, selectedWorkspaceValue, valueWorkspaceItem, initialValue, trigger, val);
          })
        } else {
          createItem(selectedWorkspaceItem.parentNode, selectedWorkspaceValue, valueWorkspaceItem, initialValue, trigger);
        }
      } catch (err) {
        // fail to find workspace element.
      }
    });
  }
}
