/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeDataProvider, TreeView, Event, EventEmitter, TreeItem, ProviderResult, Disposable, window, extensions, commands, Uri, version } from 'vscode';
import sendTelemetry, { telemetryProperties, TelemetryProperties } from '../telemetry';
import { TektonNode, MoreNode, tkn } from '../tkn';
import { Platform } from '../util/platform';
import { watchResources } from '../util/watchResources';

export class PipelineExplorer implements TreeDataProvider<TektonNode>, Disposable {
  private treeView: TreeView<TektonNode>;
  private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
  readonly onDidChangeTreeData: Event<TektonNode | undefined> = this.onDidChangeTreeDataEmitter.event;

  constructor() {
    this.treeView = window.createTreeView('tektonPipelineExplorerView', { treeDataProvider: this, canSelectMany: true });
  }

  getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
    if (element instanceof MoreNode) {
      element.command.arguments.push('tektonPipelineExplorerView');
    }
    return element;
  }

  getChildren(element?: TektonNode): ProviderResult<TektonNode[]> {
    if (element) {
      return element.getChildren();
    } else {
      return tkn.getPipelineNodes();
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
    watchResources.fsw.watcher.close();
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

  static async reportIssue(commandId?: string): Promise<void> {
    const telemetryProps: TelemetryProperties = telemetryProperties(commandId);
    let body = '';
    const repoURL = 'https://github.com/redhat-developer/vscode-tekton';
    const template = {
      'VS Code version:': version,
      'OS:': Platform.OS,
      'Extension version:': extensions.getExtension('redhat.vscode-tekton-pipelines').packageJSON.version
    };
    for (const [key, value] of Object.entries(template)) {
      body = `${body}${key} ${value}\n`;
    }
    if (commandId) {
      telemetryProps['message'] = 'Report issue command click';
      sendTelemetry(commandId, telemetryProps);
    }
    return commands.executeCommand(
      'vscode.open',
      Uri.parse(`${repoURL}/issues/new?labels=kind/bug&title=Issue&body=**Environment**\n${body}\n**Description**`));
  }

}

export const pipelineExplorer = new PipelineExplorer();
