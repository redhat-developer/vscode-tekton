/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ProviderResult, QuickPickItem, TreeItemCollapsibleState, Uri } from 'vscode';
import format = require('string-format');
import { ContextType } from '../context-type';
import { TektonNode } from './tekton-node';
import { IMAGES } from '../icon-path';

export interface DebuggerNode extends QuickPickItem {
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

export class DebuggerNodeImpl implements TektonNode {
  protected readonly CONTEXT_DATA = {
    debugger: {
      icon: 'debug-pause.svg',
      tooltip: 'Debug taskRun: {label}',
      getChildren: (): undefined[] => [],
    },
  };

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private parent: TektonNode,
    public readonly name: string,
    public readonly contextValue: ContextType,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
    public readonly uid?: string,
    public readonly creationTime?: string,
    public readonly state?: string,
  ) {}

  get iconPath(): Uri {
    return Uri.file(path.join(__dirname, IMAGES, this.CONTEXT_DATA[this.contextValue].icon));
  }

  get tooltip(): string {
    return format(this.CONTEXT_DATA[this.contextValue].tooltip, this);
  }

  get label(): string {
    return this.name;
  }

  get description(): string {
    return 'Stopped. Ready for Debugging...';
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

  // eslint-disable-next-line class-methods-use-this
  refresh(): Promise<void> {
    return Promise.resolve();
  }
}
