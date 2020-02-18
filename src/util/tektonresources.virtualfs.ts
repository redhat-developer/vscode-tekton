/* eslint-disable header/header */
// Copied from https://github.com/Azure/vscode-kubernetes-tools/blob/e16c0b239660585753dfed4732293737f6f5f06d/src/kuberesources.virtualfs.ts

/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as querystring from 'querystring';
import { FileSystemProvider, Uri, EventEmitter, FileChangeEvent, Event, Disposable, FileStat, FileType, window, WorkspaceFolder, workspace } from 'vscode';
import { Cli, CliImpl, CliExitData } from '../cli';
import { Command } from '../tkn';
import * as k8s from 'vscode-kubernetes-tools-api';
import { TektonItem } from '../tekton/tektonitem';

export const TKN_RESOURCE_SCHEME = 'tkn';
export const TEKTON_RESOURCE_AUTHORITY = 'loadtektonresource';

export function kubefsUri(value: string, outputFormat: string): Uri {
    const docname = `${value.replace('/', '-')}.${outputFormat}`;
    const nonce = new Date().getTime();
    const uri = `${TKN_RESOURCE_SCHEME}://${TEKTON_RESOURCE_AUTHORITY}/${docname}?value=${value}&_=${nonce}`;
    return Uri.parse(uri);
}

export class TektonResourceVirtualFileSystemProvider implements FileSystemProvider {

    private readonly onDidChangeFileEmitter: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>();
    private static cli: Cli = CliImpl.getInstance();

    onDidChangeFile: Event<FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

    watch(): Disposable {
        // It would be quite neat to implement this to watch for changes
        // in the cluster and update the doc accordingly.  But that is very
        // definitely a future enhancement thing!
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return new Disposable(() => {});
    }

    stat(): FileStat {
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: 65536  // These files don't seem to matter for us
        };
    }

    readDirectory(): [string, FileType][] | Thenable<[string, FileType][]> {
        return [];
    }

    createDirectory(): void | Thenable<void> {
        // no-op
    }

    readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
        return this.readFileAsync(uri);
    }

    async readFileAsync(uri: Uri): Promise<Uint8Array> {
        const content = await this.loadResource(uri);
        return Buffer.from(content, 'utf8');
    }

    async loadResource(uri: Uri): Promise<string> {
        const query = querystring.parse(uri.query);

        const outputFormat = TektonItem.getOutputFormat();
        const value = query.value as string;

        const sr = await this.execLoadResource(value, outputFormat);

        if (!sr || sr['error'] || sr['stderr']) {
            let message = sr ? sr['error'] : 'Unable to run command line tool';
            if (sr['stderr']) {
                message = sr['stderr'];
            }
            // this.host.showErrorMessage('Get command failed: ' + message);
            throw message;
        }

        return sr.stdout;
    }

    async execLoadResource(value: string, outputFormat: string): Promise<CliExitData | k8s.KubectlV1.ShellResult> {
        const kubectl = await k8s.extension.kubectl.v1;
        if (kubectl.available) {
            return await kubectl.api.invokeCommand(`-o ${outputFormat} get ${value}`);
        }
        return await TektonResourceVirtualFileSystemProvider.cli.execute(Command.getYaml(outputFormat, value));
    }

    writeFile(uri: Uri, content: Uint8Array): void | Thenable<void> {
        return this.saveAsync(uri, content);  // TODO: respect options
    }

    private async saveAsync(uri: Uri, content: Uint8Array): Promise<void> {
        // This assumes no pathing in the URI - if this changes, we'll need to
        // create subdirectories.
        // TODO: not loving prompting as part of the write when it should really be part of a separate
        // 'save' workflow - but needs must, I think
        const rootPath = await this.selectRootFolder();
        if (!rootPath) {
            return;
        }
        const fsPath = path.join(rootPath, uri.fsPath);
        fs.writeFileSync(fsPath, content);
        await TektonResourceVirtualFileSystemProvider.updateYamlFile(fsPath)
        const yamlContent = await this.loadResource(uri);
        fs.writeFileSync(fsPath, yamlContent);
        // workspace.openTextDocument(uri).then((doc) => {
        //     if (doc) {
        //         window.showTextDocument(doc);
        //     }
        // },
        // (err) => window.showErrorMessage(`Error loading document: ${err}`));
    }

    static async updateYamlFile(fsPath: string): Promise<void> {
        const kubectl = await k8s.extension.kubectl.v1;
        if (kubectl.available) {
            await kubectl.api.invokeCommand(`apply -f ${fsPath}`);
        }
        await TektonResourceVirtualFileSystemProvider.cli.execute(Command.updateYaml(fsPath));
    }

    async selectRootFolder(): Promise<string | undefined> {
        const folder = await this.showWorkspaceFolderPick();
        if (!folder) {
            return undefined;
        }
        if (folder.uri.scheme !== 'file') {
            window.showErrorMessage('This command requires a filesystem folder');  // TODO: make it not
            return undefined;
        }
        return folder.uri.fsPath;
    }

    async showWorkspaceFolderPick(): Promise<WorkspaceFolder | undefined> {
        if (!workspace.workspaceFolders) {
            window.showErrorMessage('This command requires an open folder.');
            return undefined;
        } else if (workspace.workspaceFolders.length === 1) {
            return workspace.workspaceFolders[0];
        }
        return await window.showWorkspaceFolderPick();
    }

    delete(): void | Thenable<void> {
        // no-op
    }

    rename(): void | Thenable<void> {
        // no-op
    }
}