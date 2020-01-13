/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ExecException, SpawnOptions, spawn } from 'child_process';


export interface CliExitData {
    readonly error: ExecException;
    readonly stdout: string;
    readonly stderr: string;
}

export interface Cli {
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

export class CliImpl implements Cli {
    private static instance: CliImpl;
    private tknChannel: TknChannel = new TknChannelImpl();

    static getInstance(): CliImpl {
        if (!CliImpl.instance) {
            CliImpl.instance = new CliImpl();
        }
        return CliImpl.instance;
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
            const tkn = spawn(cmd.cliCommand, cmd.cliArguments, opts);
            let stdout = '';
            const stderr = '';
            let error;
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

    prettifyJson(str: string): string {
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
