/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export interface ViewState {
  getState(): unknown; 
  setState(data: unknown): void;
}

export interface VSMessage {
  postMessage: (msg: Message) => void;
}

export interface Message {
  type: string;
  data?: unknown;
}
