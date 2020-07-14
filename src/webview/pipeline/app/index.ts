/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import './style.css';
import 'vscode-codicons/dist/codicon.ttf'
import { PipelineRunEditor } from './editor';
import { Trigger } from './common/types';

declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'trigger':
      rootElement.appendChild(new PipelineRunEditor(event.data.data).getElement());
      selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource');
      vscode.setState(event.data.data); // TODO: fix this, store real state
      break;
  }
}, false);

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}

export function selectText(nodeList: NodeListOf<Element>, text?: string, selected?: boolean, id?: string): void {
  nodeList.forEach(element => {
    const resourceSelectList = element.childNodes;
    const op = document.createElement('option');
    op.value = text;
    op.text = text;
    op.id = id ?? '';
    op.selected = selected ?? false;
    resourceSelectList.forEach(selectElement => {
      selectElement.insertBefore(op, selectElement.firstChild)
    });
  })
}

function restore(state: Trigger): void {
  rootElement.appendChild(new PipelineRunEditor(state).getElement());
  selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource');
}
