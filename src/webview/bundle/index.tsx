/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { ViewState, VSMessage } from '../common/vscode-api';
import LimitTags from './SelectAllTransferList';

declare const acquireVsCodeApi: () => ({ getState(): {tektonType: string, name: string}[]; setState(data: {tektonType: string, name: string}[]): void; postMessage: (msg: unknown) => void });
export const vscode = acquireVsCodeApi();
debugger;
const rootElement = document.getElementById('root');

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'tekton_bundle':
      vscode.setState(event.data.data);
      ReactDOM.render(
        <LimitTags />,
        rootElement,
      );
  }
}, false);

const previousState = vscode.getState();
if (previousState) {
  ReactDOM.render(
    <LimitTags />,
    rootElement,
  );
}


