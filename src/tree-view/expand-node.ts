/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProviderResult, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { TektonNode } from './tekton-node';

export class MoreNode extends TreeItem implements TektonNode {
  contextValue: string;
  creationTime?: string;
  state?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  label: string;
  tooltip: string;
  description: string;

  constructor(private showNext: number,
    private totalCount: number,
    private parent: TektonNode) {
    super('more', TreeItemCollapsibleState.None);
    this.command = { command: '_tekton.explorer.more', title: `more ${this.showNext}`, arguments: [this.showNext, this.parent] };
    this.tooltip = `${this.showNext} more from ${this.totalCount}`;
    this.description = `${this.showNext} from ${this.totalCount}`;

  }

  getChildren(): ProviderResult<TektonNode[]> {
    throw new Error('Method not implemented.');
  }
  getParent(): TektonNode {
    return this.parent;
  }
  getName(): string {
    return this.label;
  }

  refresh(): Promise<void> {
    return Promise.resolve();
  }
}
