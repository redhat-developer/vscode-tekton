/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export interface BaseData {
  id: string;
}

export interface NodeData extends BaseData {
  label: string;
  type?: string;
  id: string;
  state?: 'Cancelled'| 'Finished' | 'Started' | 'Failed' | 'Unknown';
}

export interface EdgeData extends BaseData {
  source: string;
  target: string;
}

export interface NodeOrEdge {
  data: EdgeData | NodeData;
}

export interface CyTheme {
  arrowColor: string;
  backgroundColor: string;
  fontSize: string;
  labelColor: string;
  fontFamily: string;
}
