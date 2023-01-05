/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import { SpawnOptions, spawn } from 'child_process';
import * as stream from 'stream';
import * as JStream from 'jstream';
import * as events from 'events';
import { ToolsConfig } from './tools';
import { ERR_CLUSTER_TIMED_OUT } from './constants';

export interface CliExitData {
  readonly error: string | Error;
  readonly stdout: string;
}

export interface Cli {
  execute(cmd: CliCommand, opts?: SpawnOptions): Promise<CliExitData>;
  executeWatch(cmd: CliCommand, opts?: SpawnOptions): WatchProcess;
  /**
   * Execute command, receive parsed JSON output as JS object in on('object') event
    * @param cmd 
   * @param opts 
   */
  executeWatchJSON(cmd: CliCommand, opts?: SpawnOptions): JSONWatchProcess;
}

export interface TknChannel {
  print(text: string, json?: boolean): void;
  show(): void;
}

export interface CliCommand {
  cliCommand: string;
  cliArguments: string[];
}

export interface WatchProcess extends events.EventEmitter {
  stdout: stream.Readable;
  stderr: stream.Readable;
  kill();
  readonly killed: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number) => void): this;
}

export interface JSONWatchProcess {
  stderr: stream.Readable;
  kill();
  readonly killed: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: 'object', listener: (obj: any) => void): this;
}

export function createCliCommand(cliCommand: string, ...cliArguments: string[]): CliCommand {
  if (!cliArguments) {
    cliArguments = [];
  }
  return { cliCommand, cliArguments };
}

export function cliCommandToString(command: CliCommand): string {
  return `${command.cliCommand} ${command.cliArguments.join(' ')}`;
}

class TknChannelImpl implements TknChannel {
  private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel('Tekton Pipelines');

  show(): void {
    this.channel.show();
  }

  prettifyJson(str: string): string {
    let jsonData: string;
    try {
      jsonData = JSON.stringify(JSON.parse(str), null, 2);
    } catch (ignore) {
      return str;
    }
    return jsonData;
  }

  print(text: string, json = false): void {
    const textData = json ? this.prettifyJson(text) : text;
    this.channel.append(textData);
    if (textData.charAt(textData.length - 1) !== '\n') {
      this.channel.append('\n');
    }
    if (vscode.workspace.getConfiguration('vs-tekton').get<boolean>('showChannelOnOutput')) {
      this.channel.show();
    }
  }
}

export class CliImpl implements Cli {

  private tknChannel: TknChannel = new TknChannelImpl();

  async showOutputChannel(): Promise<void> {
    this.tknChannel.show();
  }

  async execute(cmd: CliCommand, opts: SpawnOptions = {
    timeout: 10000
  }): Promise<CliExitData> {
    return new Promise<CliExitData>((resolve) => {
      this.tknChannel.print(cliCommandToString(cmd));
      if (opts.windowsHide === undefined) {
        opts.windowsHide = true;
      }
      if (opts.shell === undefined) {
        opts.shell = true;
      }
      const tkn = spawn(cmd.cliCommand, cmd.cliArguments, opts);
      let stdout = '';
      let error: string | Error = '';
      tkn.stdout.on('data', (data) => {
        stdout += data;
      });
      tkn.stderr.on('data', (data) => {
        error += data;
      });
      tkn.on('error', err => {
        // do not reject it here, because caller in some cases need the error and the streams
        // to make a decision
        error = err;
      });
      tkn.on('close', () => {
        resolve({ error, stdout });
      });
      if (opts.timeout > 0) {
        setTimeout(() => {
          error += ERR_CLUSTER_TIMED_OUT;
          tkn.kill();
        }, opts.timeout);
      }
    });
  }

  executeWatch(cmd: CliCommand, opts: SpawnOptions = {}): WatchProcess {
    if (opts.windowsHide === undefined) {
      opts.windowsHide = true;
    }
    if (opts.shell === undefined) {
      opts.shell = true;
    }
    const commandProcess = spawn(cmd.cliCommand, cmd.cliArguments, opts);

    return commandProcess;
  }

  executeWatchJSON(cmd: CliCommand, opts: SpawnOptions = {}): JSONWatchProcess {
    const toolLocation = ToolsConfig.getToolLocation(cmd.cliCommand);
    if (toolLocation) {
      // eslint-disable-next-line require-atomic-updates
      cmd.cliCommand = cmd.cliCommand.replace(cmd.cliCommand, `"${toolLocation}"`).replace(new RegExp(`&& ${cmd.cliCommand}`, 'g'), `&& "${toolLocation}"`);
    }
    const proc = this.executeWatch(cmd, opts);
    proc.stdout.pipe(new JStream()).on('data', (obj) => {
      proc.emit('object', obj);
    });
    return proc;
  }
}

export const cli = new CliImpl();

