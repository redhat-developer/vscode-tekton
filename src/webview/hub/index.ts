/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import '../common/reset.css';
import '../common/vscode.css';
import 'vscode-codicons/dist/codicon.css';
import * as api from '../../tekton-hub-client/index';
import { ViewState, VSMessage } from '../common/vscode-api';
import { TaskView } from './task-view';

declare const acquireVsCodeApi: () => ViewState & VSMessage;
export const vscode = acquireVsCodeApi();

const view = new TaskView(vscode);
window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'showTasks':{
      const tasks: api.ResourceData[] = event.data.data;
      view.showTasks(tasks);
      break;
    }
    case 'error': 
      view.setErrorState(event.data.data);
      break;
    case 'tknVersion': 
      view.setTknVersion(event.data.data);
      break;
    case 'installedTasks':
      view.setInstalledTasks(event.data.data);
      break;
    case 'recommendedTasks':
      view.setRecommendedTasks(event.data.data);
      break;
    default: 
      console.error(`Cannot handle: ${JSON.stringify(event.data)}`);

  }
}, false);

vscode.postMessage({type: 'ready'});
