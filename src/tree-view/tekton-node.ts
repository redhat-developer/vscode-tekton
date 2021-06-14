/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProviderResult, QuickPickItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { ContextType } from '../context-type';
import { Tkn } from '../tkn';
import format = require('string-format');
import * as path from 'path';
import { IMAGES, ERROR_PATH } from '../icon-path';

export interface TektonNode extends QuickPickItem {
  getChildren(): ProviderResult<TektonNode[]>;
  getParent(): TektonNode | undefined;
  getName(): string;
  refresh(): Promise<void>;
  contextValue?: string;
  creationTime?: string;
  state?: string;
  visibleChildren?: number;
  collapsibleState?: TreeItemCollapsibleState;
  uid?: string;
}

export class TektonNodeImpl implements TektonNode {
  protected readonly CONTEXT_DATA = {
    pipelinenode: {
      icon: 'PL.svg',
      tooltip: 'Pipelines: {label}',
      getChildren: () => this.tkn.getPipelines(this)
    },
    pipelinerunnode: {
      icon: 'PLR.svg',
      tooltip: 'PipelineRuns: {label}',
      getChildren: () => this.tkn.getPipelineRunsList(this)
    },
    pipelineresourcenode: {
      icon: 'PR.svg',
      tooltip: 'PipelineResources: {label}',
      getChildren: () => this.tkn.getPipelineResources(this)
    },
    pipelineresource: {
      icon: 'PR.svg',
      tooltip: 'PipelineResources: {label}',
      getChildren: () => []
    },
    tasknode: {
      icon: 'T.svg',
      tooltip: 'Tasks: {label}',
      getChildren: () => this.tkn.getTasks(this)
    },
    clustertasknode: {
      icon: 'CT.svg',
      tooltip: 'ClusterTasks: {label}',
      getChildren: () => this.tkn.getClusterTasks(this)
    },
    pipeline: {
      icon: 'PL.svg',
      tooltip: 'Pipeline: {label}',
      getChildren: () => this.tkn.getPipelineRuns(this)
    },
    pipelinerun: {
      icon: 'PLR.svg',
      tooltip: 'PipelineRun: {label}',
      getChildren: () => []
    },
    pipelineRunFinished: {
      icon: 'PLR.svg',
      tooltip: 'PipelineRun: {label}',
      getChildren: () => []
    },
    task: {
      icon: 'T.svg',
      tooltip: 'Task: {label}',
      getChildren: () => this.tkn.getTaskRunsForTasks(this)
    },
    taskrun: {
      icon: 'TR.svg',
      tooltip: 'TaskRun: {label}',
      getChildren: () => []
    },
    clustertask: {
      icon: 'CT.svg',
      tooltip: 'Clustertask: {label}',
      getChildren: () => this.tkn.getTaskRunsForClusterTasks(this)
    },
    tknDown: {
      icon: 'tkn-down.png',
      tooltip: 'Cannot connect to the tekton',
      getChildren: () => []
    },
    triggertemplatesnode: {
      icon: 'TT.svg',
      tooltip: 'TriggerTemplates: {label}',
      getChildren: () => this.tkn.getTriggerTemplates(this)
    },
    triggertemplates: {
      icon: 'TT.svg',
      tooltip: 'TriggerTemplates: {label}',
      getChildren: () => []
    },
    triggerbindingnode: {
      icon: 'TB.svg',
      tooltip: 'TriggerBinding: {label}',
      getChildren: () => this.tkn.getTriggerBinding(this)
    },
    triggerbinding: {
      icon: 'TB.svg',
      tooltip: 'TriggerBinding: {label}',
      getChildren: () => []
    },
    clustertriggerbindingnode: {
      icon: 'CTB.svg',
      tooltip: 'ClusterTriggerBinding: {label}',
      getChildren: () => this.tkn.getClusterTriggerBinding(this)
    },
    clustertriggerbinding: {
      icon: 'CTB.svg',
      tooltip: 'ClusterTriggerBinding: {label}',
      getChildren: () => []
    },
    eventlistenernode: {
      icon: 'EL.svg',
      tooltip: 'EventListener: {label}',
      getChildren: () => this.tkn.getEventListener(this)
    },
    eventlistener: {
      icon: 'EL.svg',
      tooltip: 'EventListener: {label}',
      getChildren: () => []
    },
    conditionsnode: {
      icon: 'C.svg',
      tooltip: 'Conditions: {label}',
      getChildren: () => this.tkn.getConditions(this)
    },
    conditions: {
      icon: 'C.svg',
      tooltip: 'Conditions: {label}',
      getChildren: () => []
    },
    tr: {
      icon: 'C.svg',
      tooltip: 'ConditionRun: {label}',
      getChildren: () => []
    },
    taskrunnode: {
      icon: 'TR.svg',
      tooltip: 'TaskRuns: {label}',
      getChildren: () => this.tkn.getTaskRunList(this)
    },
  };

  constructor(private parent: TektonNode,
    public readonly name: string,
    public readonly contextValue: ContextType,
    protected readonly tkn: Tkn,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
    public readonly uid?: string,
    public readonly creationTime?: string,
    public readonly state?: string) {

  }

  get iconPath(): Uri {
    if (this.state) {
      let filePath = IMAGES;
      switch (this.state) {
        case 'False': {
          filePath = ERROR_PATH;
          break;
        }
        case 'True': {
          filePath = IMAGES;
          break;
        }
        default: {
          return Uri.file(path.join(__dirname, IMAGES, 'running.gif'));
        }
      }
      return Uri.file(path.join(__dirname, filePath, this.CONTEXT_DATA[this.contextValue].icon));
    }
    return Uri.file(path.join(__dirname, IMAGES, this.CONTEXT_DATA[this.contextValue].icon));
  }

  get tooltip(): string {
    return format(this.CONTEXT_DATA[this.contextValue].tooltip, this);
  }

  get label(): string {
    return this.name;
  }

  getName(): string {
    return this.name;
  }

  getChildren(): ProviderResult<TektonNode[]> {
    return this.CONTEXT_DATA[this.contextValue].getChildren();
  }

  getParent(): TektonNode {
    return this.parent;
  }

  refresh(): Promise<void> {
    return Promise.resolve();
  }
}
