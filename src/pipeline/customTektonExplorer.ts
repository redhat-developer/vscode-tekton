/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeDataProvider, Disposable, TreeView, window, Event, ProviderResult, TreeItem, EventEmitter, TreeItemCollapsibleState } from 'vscode';
import { TektonNode, MoreNode } from '../tkn';
import { pipelineExplorer } from './pipelineExplorer';

export class CustomTektonExplorer implements TreeDataProvider<TektonNode>, Disposable {

  private treeView: TreeView<TektonNode>;
  private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
  readonly onDidChangeTreeData: Event<TektonNode | undefined> = this.onDidChangeTreeDataEmitter.event;

  private rootItems: TektonNode[] | undefined;
  private itemsToShow: TektonNode[] | undefined;

  constructor() {
    this.treeView = window.createTreeView('tektonCustomTreeView', { treeDataProvider: this });
  }

  dispose(): void {
    this.treeView.dispose();
  }

  getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
    if (element instanceof MoreNode) {
      element.command.arguments.push('tektonCustomTreeView');
    }
    if (this.rootItems.includes(element)) {
      (element as TreeItem).collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    return element; //TODO: modify view state if item there
  }
  getChildren(element?: TektonNode): ProviderResult<TektonNode[]> {
    if (element) {
      return Promise.resolve(element.getChildren()).then(c => this.filterChildren(c));
    } else {
      return this.rootItems;
    }
  }
  getParent?(element: TektonNode): ProviderResult<TektonNode> {
    return element.getParent();
  }


  refresh(target?: TektonNode): void {
    this.onDidChangeTreeDataEmitter.fire(target);
  }

  showSelected(show: boolean): void {
    if (show) {
      const selection = pipelineExplorer.getSelection();
      if (selection) {
        this.itemsToShow = this.filterParents(selection);
        this.rootItems = this.getRoots(selection);
        this.refresh();
      }
    } else {
      this.rootItems = undefined;
      this.itemsToShow = undefined;
      this.refresh();
    }

  }

  private getRoots(nodes: TektonNode[]): TektonNode[] {
    const result = [];
    for (const node of nodes) {
      const parent = this.getNodeParent(node);
      if (!result.includes(parent)) {
        result.push(parent);
      }
    }
    return result;
  }

  private getNodeParent(node: TektonNode): TektonNode {
    if (node.getParent()) {
      if (node.getParent().getName() === 'root') {
        return node;
      }
      return this.getNodeParent(node.getParent());
    }
    return node;
  }

  private filterParents(nodes: TektonNode[]): TektonNode[] {
    const result = [...nodes];
    for (const node of nodes) {
      if (nodes.includes(node.getParent())) {
        result.splice(result.indexOf(node.getParent()), 1);
      }
    }
    return result;
  }

  private filterChildren(nodes: TektonNode[]): TektonNode[] {
    const result = [];
    for (const node of nodes) {
      for (const targetNode of this.itemsToShow) {
        if (this.isParent(targetNode, node)) {
          result.push(node);
        }
        if (!result.includes(node)) {
          if (this.isParent(node, targetNode)) {
            result.push(node);
          }
        }
      }
    }

    return result;
  }

  private isParent(target: TektonNode, parent: TektonNode): boolean {
    if (target.getName() === parent.getName()) {
      return true;
    }
    let possibleParent = target.getParent();
    while (possibleParent) {
      if (possibleParent.getName() === parent.getName()) {
        return true;
      }

      possibleParent = possibleParent.getParent();
    }

    return false;
  }


}

export const customTektonExplorer = new CustomTektonExplorer();
