/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export enum ContextType {
  TASK = 'task',
  TASKRUN = 'taskrun',
  PIPELINE = 'pipeline',
  PIPELINERUN = 'pipelinerun',
  PIPELINERUNCHILDNODE = 'pipelineRunFinished',
  CLUSTERTASK = 'clustertask',
  TASKRUNNODE = 'taskrunnode',
  PIPELINENODE = 'pipelinenode',
  PIPELINERESOURCENODE = 'pipelineresourcenode',
  PIPELINERESOURCE = 'pipelineresource',
  TASKNODE = 'tasknode',
  CLUSTERTASKNODE = 'clustertasknode',
  TKN_DOWN = 'tknDown',
  TRIGGERTEMPLATESNODE = 'triggertemplatesnode',
  TRIGGERTEMPLATES = 'triggertemplates',
  TRIGGERBINDINGNODE = 'triggerbindingnode',
  TRIGGERBINDING = 'triggerbinding',
  CLUSTERTRIGGERBINDINGNODE = 'clustertriggerbindingnode',
  CLUSTERTRIGGERBINDING = 'clustertriggerbinding',
  EVENTLISTENERNODE = 'eventlistenernode',
  EVENTLISTENER = 'eventlistener',
  CONDITIONSNODE = 'conditionsnode',
  CONDITIONS = 'conditions',
  PIPELINERUNNODE = 'pipelinerunnode',
  CONDITIONTASKRUN = 'tr',
  DEBUGGER = 'debugger'
}
