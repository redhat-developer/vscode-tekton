/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import './style.css';
import 'vscode-codicons/dist/codicon.ttf'
import { PipelineRunEditor } from './editor';
import { Trigger } from './common/types';
import { SelectWidget } from './element/selectwidget';

declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

window.addEventListener('message', event => {

  switch (event.data.type) {
    case 'trigger':
      rootElement.appendChild(new PipelineRunEditor(event.data.data).getElement());
      selectText(document.querySelectorAll('[id^=Resources]'));
      vscode.setState(event.data.data); // TODO: fix this, store real state
      break;
  }
}, false);

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}


function selectText(nodeList: NodeListOf<Element>): void {
  nodeList.forEach(element => {
    const resourceSelectList = element.childNodes;
    const op = document.createElement('option');
    op.value = 'Create Pipeline Resource';
    op.text = 'Create Pipeline Resource';
    resourceSelectList.forEach(selectElement => {
      selectElement.insertBefore(op, selectElement.firstChild)
    });
  })
}

function restore(state: Trigger): void {
  rootElement.appendChild(new PipelineRunEditor(state).getElement());
  selectText(document.querySelectorAll('[id^=Resources]'));
}


