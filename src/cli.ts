/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import { ExecException, SpawnOptions } from 'child_process';

export interface CliExitData {
    readonly error: ExecException;
    readonly stdout: string;
    readonly stderr: string;
}

export interface ICli {
    execute(cmd: CliCommand, opts?: SpawnOptions): Promise<CliExitData>;
}

export interface TknChannel {
    print(text: string): void;
    show(): void;
}

export interface CliCommand {
    cliCommand: string;
    cliArguments: string[];
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

export class Cli implements ICli {
    private static instance: Cli;
    private tknChannel: TknChannel = new TknChannelImpl();

    private constructor() { }

    static getInstance(): Cli {
        if (!Cli.instance) {
            Cli.instance = new Cli();
        }
        return Cli.instance;
    }

    async showOutputChannel(): Promise<void> {
        this.tknChannel.show();
    }

    async execute(cmd: CliCommand, opts: SpawnOptions = {}): Promise<CliExitData> {
        return new Promise<CliExitData>((resolve) => {
            this.tknChannel.print(cliCommandToString(cmd));
            if (opts.windowsHide === undefined) {
                opts.windowsHide = true;
            }
            if (opts.shell === undefined) {
                opts.shell = true;
            }
            const tkn = childProcess.spawn(cmd.cliCommand, cmd.cliArguments, opts);
            let stdout = '';
            let stderr = '';
            let error: Error;
            tkn.stdout.on('data', (data) => {
                stdout += data;
            });
            tkn.stderr.on('data', (data) => {
                stderr += data;
            });
            tkn.on('error', err => {
                // do not reject it here, because caller in some cases need the error and the streams
                // to make a decision
                error = err;
            });
            tkn.on('close', () => {
                resolve({ error, stdout, stderr });
            });
        });
    }
}

class TknChannelImpl implements TknChannel {
    private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel("Tekton Pipelines");

    show(): void {
        this.channel.show();
    }

    prettifyJson(str: string) {
        let jsonData: string;
        try {
            jsonData = JSON.stringify(JSON.parse(str), null, 2);
        } catch (ignore) {
            return str;
        }
        return jsonData;
    }

    print(text: string): void {
        const textData = this.prettifyJson(text);
        this.channel.append(textData);
        if (textData.charAt(textData.length - 1) !== '\n') {
            this.channel.append('\n');
        }
        if (vscode.workspace.getConfiguration('vs-tekton').get<boolean>('showChannelOnOutput')) {
            this.channel.show();
        }
    }
}
