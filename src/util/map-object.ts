/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { DebugSessionEntry } from '../debugger/debug-tree-view';


export const debugName: Map<string, boolean> = new Map();
export const debugSessions: Map<string, DebugSessionEntry> = new Map();
export const pipelineTriggerStatus = new Map<string, boolean>();
