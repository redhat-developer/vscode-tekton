/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TreeDataProvider, TreeView, Event, EventEmitter, TreeItem, ProviderResult, Disposable, window, extensions, commands, Uri, version } from "vscode";
import { Tkn, TektonNode, TknImpl } from '../tkn';
import { WatchUtil, FileContentChangeNotifier } from '../util/watch';
import { Platform } from '../util/platform';
import * as path from 'path';

const kubeConfigFolder: string = path.join(Platform.getUserHomePath(), '.kube');

export class PipelineExplorer implements TreeDataProvider<TektonNode>, Disposable {
    private static tkn: Tkn = TknImpl.Instance;
    private treeView: TreeView<TektonNode>;
    private fsw: FileContentChangeNotifier;
    private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
    readonly onDidChangeTreeData: Event<TektonNode | undefined> = this.onDidChangeTreeDataEmitter.event;

    private zenMod = false;
    private zenSelected: TektonNode[];


    constructor() {
        this.fsw = WatchUtil.watchFileForContextChange(kubeConfigFolder, 'config');
        this.fsw.emitter.on('file-changed', this.refresh.bind(this));
        this.treeView = window.createTreeView('tektonPipelineExplorer', { treeDataProvider: this, canSelectMany: true });
    }

    getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
        return element;
    }

    getChildren(element?: TektonNode): ProviderResult<TektonNode[]> {
        if (element) {
            return element.getChildren();
        } else if (this.zenMod) {
            return this.zenSelected;
        } else {
            return PipelineExplorer.tkn.getPipelineNodes();
        }

    }

    getParent?(element: TektonNode): TektonNode {
        return element.getParent();
    }

    refresh(target?: TektonNode): void {
        if (!target) {
            PipelineExplorer.tkn.clearCache();
        }
        this.onDidChangeTreeDataEmitter.fire(target);
    }

    dispose(): void {
        this.fsw.watcher.close();
        this.treeView.dispose();
    }

    async reveal(item: TektonNode): Promise<void> {
        this.refresh(item.getParent());
        // double call of reveal is workaround for possible upstream issue
        // https://github.com/redhat-developer/vscode-openshift-tools/issues/762
        await this.treeView.reveal(item);
        this.treeView.reveal(item);
    }

    zenMode(mode: boolean): void {
        this.zenMod = mode;
        if (mode) {
            this.zenSelected = this.treeView.selection;
        } else {
            this.zenSelected = [];
        }
        this.refresh();
    }


    static async reportIssue(): Promise<void> {
        let body = '';
        const repoURL = `https://github.com/redhat-developer/vscode-tekton`;
        const template = {
            'VS Code version:': version,
            'OS:': Platform.OS,
            'Extension version:': extensions.getExtension('redhat.vscode-tekton-pipelines').packageJSON.version
        };
        for (const [key, value] of Object.entries(template)) {
            body = `${body}${key} ${value}\n`;
        }
        return commands.executeCommand(
            'vscode.open',
            Uri.parse(`${repoURL}/issues/new?labels=kind/bug&title=Issue&body=**Environment**\n${body}\n**Description**`));
    }

}

export const pipelineExplorer = new PipelineExplorer();
