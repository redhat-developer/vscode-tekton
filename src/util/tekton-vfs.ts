/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { FileSystemProvider, EventEmitter, FileChangeEvent, Event, Uri, Disposable, FileStat, FileType, FileChangeType } from 'vscode';
import { CliExitData, cli } from '../cli';
import { newK8sCommand, ContextType } from '../tkn';
import * as path from 'path';
import * as os from 'os'
import * as fsx from 'fs-extra';
import { VirtualDocument } from '../yaml-support/yaml-locator';
import { TektonItem } from '../tekton/tektonitem';
import { originalFileName, newFileName } from './filename';
import { getStderrString } from './stderrstring';

export const TKN_RESOURCE_SCHEME = 'tekton';
export const TKN_RESOURCE_SCHEME_READONLY = 'tekton-ro';
const readonlyRegex = /(taskrun|pipelinerun|pipelineRunFinished|tr)/ as RegExp;

const pipelineRunFinishedRegex = RegExp(`^${ContextType.PIPELINERUNCHILDNODE}/`);
const taskRegex = RegExp(`^${ContextType.TASK}/`);

/**
 * Create Uri for Tekton VFS 
 * @param type tekton resource type
 * @param name tekton resource name
 * @param format output format (yaml|json)
 */
export function tektonFSUri(type: string, name: string, format: string, uid?: string): Uri {
  if (uid) name = newFileName(name, uid);
  const scheme = readonlyRegex.test(type) ? TKN_RESOURCE_SCHEME_READONLY : TKN_RESOURCE_SCHEME;
  return Uri.parse(`${scheme}://kubernetes/${type}/${name}.${format}`);
}


export class TektonVFSProvider implements FileSystemProvider {

  private readonly onDidChangeFileEmitter: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>();

  onDidChangeFile: Event<FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

  private fileStats = new Map<string, VFSFileStat>();

  watch(): Disposable {
    return new Disposable(() => true);
  }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    return this.ensureStat(uri);
  }

  private ensureStat(uri: Uri): VFSFileStat {
    if (!this.fileStats.has(uri.toString())) {
      this.fileStats.set(uri.toString(), new VFSFileStat());
    }

    const stat = this.fileStats.get(uri.toString());
    stat.changeStat(stat.size + 1);

    return stat;
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const [resource, format] = this.extractResourceAndFormat(uri);

    const loadResult = await this.loadK8sResource(resource, format);
    if (loadResult.error) {
      throw new Error(getStderrString(loadResult.error));
    }

    return Buffer.from(loadResult.stdout, 'utf8'); // TODO: add execute which return buffer instead of string

  }

  async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    const tempPath = os.tmpdir();
    const fsPath = path.join(tempPath, uri.fsPath);

    await fsx.ensureFile(fsPath);
    await fsx.writeFile(fsPath, content);

    const updateResult = await this.updateK8sResource(fsPath);

    const oldStat = await fsx.stat(fsPath);
    await fsx.unlink(fsPath);

    if (updateResult.error) {
      throw new Error(getStderrString(updateResult.error));
    }

    // Use timeout to fire file change event in another event loop cycle, this will cause update content inside editor
    setTimeout(() => {
      this.fileStats.get(uri.toString())?.changeStat(oldStat.size + 1); // change stat to ensure content update 
      this.onDidChangeFileEmitter.fire([{ uri, type: FileChangeType.Changed }]);
    }, 10);
  }

  private loadK8sResource(resource: string, outputFormat: string, uid = true): Promise<CliExitData> {
    let newResourceName = (uid) ? originalFileName(resource) : resource;
    if (pipelineRunFinishedRegex.test(newResourceName)) {
      newResourceName = newResourceName.replace(`${ContextType.PIPELINERUNCHILDNODE}/`, `${ContextType.PIPELINERUN}/`);
    }
    if (taskRegex.test(newResourceName)) {
      newResourceName = newResourceName.replace(`${ContextType.TASK}/`, `${ContextType.TASK}.tekton/`);
    }
    return cli.execute(newK8sCommand(`-o ${outputFormat} get ${newResourceName}`));
  }

  async updateK8sResource(fsPath: string): Promise<CliExitData> {
    return await cli.execute(newK8sCommand(`apply -f ${fsPath}`));
  }

  readDirectory(): [string, FileType][] | Thenable<[string, FileType][]> {
    return []; // no-op
  }
  createDirectory(): void | Thenable<void> {
    // no-op
  }

  delete(): void | Thenable<void> {
    // no-op
  }
  rename(): void | Thenable<void> {
    // no-op
  }

  extractResourceAndFormat(uri: Uri): [string, string] {
    const resPath = path.parse(uri.path);
    let ext = resPath.ext;
    let resource = path.posix.format(resPath).substring(1);
    if (ext) {
      resource = resource.slice(0, -ext.length);
    } else {
      ext = TektonItem.getOutputFormat();
    }

    if (ext?.startsWith('.')) {
      ext = ext.substring(1);
    }
    return [resource, ext];
  }

  async loadTektonDocument(uri: Uri, uid?: boolean): Promise<VirtualDocument> {
    const [resource, format] = this.extractResourceAndFormat(uri);

    const sr = await this.loadK8sResource(resource, format, uid);

    if (!sr || sr['error']) {
      const message = sr ? sr['error'] : 'Unable to run command line tool';
      throw message;
    }

    return {
      uri,
      version: 1,
      getText: () => sr.stdout
    };
  }

}

export const tektonVfsProvider = new TektonVFSProvider();

class VFSFileStat implements FileStat {
  readonly type = FileType.File;
  readonly ctime = 0;
  mtime = 0;
  size = 65536;

  changeStat(size: number): void {
    this.mtime++;
    this.size = size;
  }

}
