import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import * as path from 'path';
import { InstallController } from './install';
import { exec } from './exec';


export interface NamespaceToResource {
    [key: string]: Array<string>;
}

export class PipelineResourceExplorer implements k8s.ClusterExplorerV1.NodeContributor {
    constructor (
        private readonly installController: InstallController
    ) {}

    contributesChildren (parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined): boolean {
        return !!parent && parent.nodeType === 'context';
    }

    async getChildren (parent: k8s.ClusterExplorerV1.ClusterExplorerNode | undefined): Promise<k8s.ClusterExplorerV1.Node[]> {
        if (!this.installController) {
            // Todo: return an error node.
            return [];
        }

        const isInstalled = await this.installController.isInstalled();

        if (isInstalled.result === false) {
            // Todo: return an error node.
            return [];
        }

        return [new MeshedResourceFolderNode()];
    }
}


class MeshedResourceFolderNode implements k8s.ClusterExplorerV1.Node {
    async getChildren (): Promise<k8s.ClusterExplorerV1.Node[]> {
        // TODO: Why does linkerd pick up istio meshed pods?
        const meshedResources = await exec("get pods --all-namespaces");

        if (!meshedResources || meshedResources.code !== 0) {
            return [];
        }

        const meshedResourceStdout = meshedResources.stdout;
        const meshedResourceArray = meshedResourceStdout.split('\n').filter(
            (value) => { return value.length > 0; }
        );

        const namespaceToResource: NamespaceToResource = {};
        const namespaces:Array<string> = [];

        meshedResourceArray.forEach((value) => {
            const namespaceAndPod = value.split('/');
            const namespace = namespaceAndPod[0];
            const podName = namespaceAndPod[1];

            if (!namespaces.includes(namespace)) {
                namespaces.push(namespace);
                namespaceToResource[namespace] = [];
            }

            namespaceToResource[namespace].push(podName);
        });

        return namespaces.map(
            (meshedNamespace: string) => new MeshedResourceNamespace(meshedNamespace, namespaceToResource[meshedNamespace])
        );
    }

    getTreeItem (): vscode.TreeItem {
        const treeItem = new vscode.TreeItem('Linkerd Mesh', vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.contextValue = 'linkerd.mesh';
        return treeItem;
    }
}

class MeshedResourceNamespace implements k8s.ClusterExplorerV1.Node {
    constructor(private readonly meshedNamespace: string, private readonly namespaceResources: string[]) {}

    async getChildren (): Promise<k8s.ClusterExplorerV1.Node[]> {
        return this.namespaceResources.map((podName: string) => new MeshedResourcePod(this.meshedNamespace, podName));
    }

    getTreeItem (): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            this.meshedNamespace,
            vscode.TreeItemCollapsibleState.Collapsed
        );

        treeItem.contextValue = 'linkerd.meshedNamespace';
        return treeItem;
    }
}

class MeshedResourcePod implements k8s.ClusterExplorerV1.Node {
    constructor(private readonly meshedNamespace: string, private readonly meshedPodName: string) {}

    getTreeItem (): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            this.meshedPodName,
            vscode.TreeItemCollapsibleState.None
        );

        treeItem.contextValue = 'linkerd.meshedPod';
        treeItem.iconPath = vscode.Uri.file(path.join(__dirname, "../../assets/linkerd.svg"));
        return treeItem;
    }

    async getChildren (): Promise<k8s.ClusterExplorerV1.Node[]> {
        return [];
    }
}