import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import * as tkn from '../tkn';
import * as path from 'path';
import { exec } from 'child_process';
import { parentPort } from 'worker_threads';

export class ExternalPipelineNodeContributor implements k8s.ClusterExplorerV1.NodeContributor {
    contributesChildren(parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined ): boolean {
        return !!parent && parent.nodeType === "context";
    }    
    async getChildren(__parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined ): Promise<k8s.ClusterExplorerV1.Node[]> {
        return [new ExternalPipelineFolderNode()];
    }
}

class ExternalPipelineFolderNode implements k8s.ClusterExplorerV1.Node {
    async getChildren(): Promise<k8s.ClusterExplorerV1.Node[]> {
    return []; 

    }
    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('Tekton Pipelines', vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.contextValue = 'tkn.folder'; 
        treeItem.iconPath = vscode.Uri.file(path.join(__dirname,"../../../images/tekton.png"));
        return treeItem;
    }
}

class ExternalPipelineNode implements k8s.ClusterExplorerV1.Node {
    constructor(private readonly pipelinenode: tkn.TektonNode){}
    async getChildren(): Promise<k8s.ClusterExplorerV1.Node[]> {
            return [];
        
    }
    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.pipelinenode.getName(), vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.contextValue = 'tkn.pipelinenode';
        return treeItem;
    }
}

/**
 *  if ((node as any).nodeType === 'context') {
        lastNamespace = await initNamespaceName(node);
        if (isTekton()) {
            treeItem.iconPath = vscode.Uri.file(path.join(__dirname, "../images/tekton.png"));
        }
    }
    if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Pipeline') {
        // assuming now that it’s a project node
        const pipelineName = node.name;
        if (pipelineName === lastNamespace) {
            treeItem.label = `* ${treeItem.label}`;
        } else {
            treeItem.contextValue = `${treeItem.contextValue || ''}.tekton.inactiveProject`;
        }
    }
 */