/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import '../common/reset.css';
import '../common/vscode.css';
import 'vscode-codicons/dist/codicon.css';
import { ViewState, VSMessage } from '../common/vscode-api';
import { TaskWidget } from './task-widget';


declare const acquireVsCodeApi: () => ViewState & VSMessage;
export const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');
const widget = new TaskWidget(rootElement, vscode);

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'showTask':
      widget.showTask(event.data.data.task, event.data.data.tknVersion);
      break;
    case 'setVersions': 
      widget.setVersions(event.data.data);
      break;
    case 'taskVersion': 
      widget.setTaskVersion(event.data.data);
  }
}, false);


vscode.postMessage({type: 'ready'});
