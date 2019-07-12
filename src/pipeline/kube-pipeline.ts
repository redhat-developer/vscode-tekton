import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import * as tkn from '../tkn';

export class ExternalPipelineNodeContributor implements k8s.ClusterExplorerV1.NodeContributor {
    contributesChildren(parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined ): boolean {
        return !!parent && parent.nodeType === "context";
    }    
    async getChildren(parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined ): Promise<k8s.ClusterExplorerV1.Node[]> {
        return [new ExternalPipelineFolderNode()];
    }
}

class ExternalPipelineFolderNode implements k8s.ClusterExplorerV1.Node {
    async getChildren(): Promise<k8s.ClusterExplorerV1.Node[]> {
        const pipelineResources = await tkn.TknImpl.Instance.getPipelineResources() || [];
        return pipelineResources.map((pipelines) => new ExternalPipelineNode(pipelines));
    }
    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('Tekton Pipelines', vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.contextValue = 'tkn.folder';
        return treeItem;
    }
}

class ExternalPipelineNode implements k8s.ClusterExplorerV1.Node {
    constructor(private readonly pipeline: tkn.TektonNode) {}
    async getChildren(): Promise<k8s.ClusterExplorerV1.Node[]> {
        return [];
    }
    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.pipeline.getName(), vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.contextValue = 'tkn.externalservice';
        return treeItem;
}
    
}