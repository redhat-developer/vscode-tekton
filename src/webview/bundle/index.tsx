/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { ViewState, VSMessage } from '../common/vscode-api';
import TransferList from './SelectAllTransferList';

declare const acquireVsCodeApi: () => ViewState & VSMessage;
export const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

ReactDOM.render(
  <TransferList />,
  rootElement,
);
