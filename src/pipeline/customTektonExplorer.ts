/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeDataProvider, Disposable, TreeView, window, Event, ProviderResult, TreeItem, EventEmitter } from 'vscode';
import { TektonNode, MoreNode } from '../tkn';
import { pipelineExplorer } from './pipelineExplorer';

export class CustomTektonExplorer implements TreeDataProvider<TektonNode>, Disposable {

  private treeView: TreeView<TektonNode>;
  private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
  readonly onDidChangeTreeData: Event<TektonNode | undefined> = this.onDidChangeTreeDataEmitter.event;

  private items: TektonNode[];

  constructor() {
    this.treeView = window.createTreeView('tektonCustomTree', { treeDataProvider: this });
  }

  dispose(): void {
    this.treeView.dispose();
  }

  getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
    if (element instanceof MoreNode) {
      element.command.arguments.push('tektonCustomTree');
    }
    return element; //TODO: modify view state if item there
  }
  getChildren(element?: TektonNode): ProviderResult<TektonNode[]> {
    if (element) {
      return element.getChildren();
    } else {
      return this.items;
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
        this.items = selection;
        this.refresh();
      }
    } else {
      this.items = undefined;
      this.refresh();
    }

  }


}

export const customTektonExplorer = new CustomTektonExplorer();
