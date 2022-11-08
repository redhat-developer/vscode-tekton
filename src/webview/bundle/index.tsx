/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import App from './App';

declare const acquireVsCodeApi: () => ({ getState(): {tektonType: string, name: string}[]; setState(data: {tektonType: string, name: string}[]): void; postMessage: (msg: unknown) => void });
export const vscode = acquireVsCodeApi();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rootElement: any = document.getElementById('root');

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'tekton_bundle':
      vscode.setState(event.data.data);
      ReactDOM.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
        rootElement
      );
  }
});

const previousState = vscode.getState();
if (previousState) {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    rootElement
  );
}


