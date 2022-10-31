/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

declare const acquireVsCodeApi: () => ({ getState(): {tektonType: string, name: string}[]; setState(data: {tektonType: string, name: string}[]): void; postMessage: (msg: unknown) => void });
export const vscode = acquireVsCodeApi();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rootElement: any = document.getElementById('root');
const root = createRoot(rootElement);

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'tekton_bundle':
      vscode.setState(event.data.data);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
  }
});

const previousState = vscode.getState();
if (previousState) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}


