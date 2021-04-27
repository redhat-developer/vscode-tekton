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
  state?: 'Cancelled'| 'Finished' | 'Started' | 'Failed' | 'Unknown';
  yamlPosition?: number;
  final?: boolean;
  steps?: StepData[];
  taskRef?: string; 
}

export interface StepData {
  name: string;
  running?: StepStateRunning;
  terminated?: StepStateTerminated;
  waiting?: StepStateWaiting;
}

export interface StepStateRunning {
  /**
   * Time at which the container was last (re-)started
   */
  startedAt?: string;
}

export interface StepStateTerminated {
  /**
  * Exit status from the last termination of the container
  */
  'exitCode': number;
  /**
  * Time at which the container last terminated
  */
  'finishedAt'?: string;
  /**
  * Message regarding the last termination of the container
  */
  'message'?: string;
  /**
  * (brief) reason from the last termination of the container
  */
  'reason'?: string;
  /**
  * Signal from the last termination of the container
  */
  'signal'?: number;
  /**
  * Time at which previous execution of the container started
  */
  'startedAt'?: string;
}

export interface StepStateWaiting {
  /**
  * Message regarding why the container is not yet running.
  */
  'message'?: string;
  /**
   * (brief) reason the container is not yet running.
   */
  'reason'?: string;
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
  targetEdgesColor: string;
  sourceEdgesColor: string;
}
