/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Disposable, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeView, window } from 'vscode';
import { TektonNode } from '../tree-view/tekton-node';
import { debugTreeView } from './debug-tree-view';

export class DebugExplorer implements TreeDataProvider<TektonNode>, Disposable {

  private treeView: TreeView<TektonNode>;
  private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
  readonly onDidChangeTreeData: Event<TektonNode | undefined> = this.onDidChangeTreeDataEmitter.event;

  constructor() {
    this.treeView = window.createTreeView('tektonDebugView', { treeDataProvider: this, canSelectMany: true });
  }

  getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: TektonNode): ProviderResult<TektonNode[]> {
    if (element) {
      return element.getChildren();
    } else {
      return debugTreeView();
    }

  }

  getParent?(element: TektonNode): TektonNode {
    return element.getParent();
  }

  async refresh(target?: TektonNode): Promise<void> {
    if (target) {
      await target.refresh();
    }
    this.onDidChangeTreeDataEmitter.fire(target);
  }

  dispose(): void {
    this.treeView.dispose();
  }

  async reveal(item: TektonNode): Promise<void> {
    this.refresh(item.getParent());
    // double call of reveal is workaround for possible upstream issue
    // https://github.com/redhat-developer/vscode-openshift-tools/issues/762
    await this.treeView.reveal(item);
    this.treeView.reveal(item);
  }

  getSelection(): TektonNode[] | undefined {
    return this.treeView.selection;
  }

  isVisible(): boolean {
    return this.treeView.visible;
  }
}
  
export const debugExplorer = new DebugExplorer();
  
