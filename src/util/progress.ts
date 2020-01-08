/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as tknctl from '../tkn';
import { CliCommand, createCliCommand } from '../cli';

export interface Step {
    command: CliCommand;
    increment: number;
    total?: number;
}

export class Progress {
    static execWithProgress(options, steps: Step[], tkn: tknctl.Tkn): Thenable<void> {
        return vscode.window.withProgress(options,
            (progress: vscode.Progress<{increment: number, message: string}>, token: vscode.CancellationToken) => {
                const calls: (()=>Promise<any>)[] = [];
                steps.reduce((previous: Step, current: Step, currentIndex: number, steps: Step[])=> {
                    current.total = previous.total + current.increment;
                    calls.push (() => {
                        return Promise.resolve()
                            .then(() => progress.report({increment: previous.increment, message: `${previous.total}%` }))
                            .then(() => tkn.execute(current.command))
                            .then(() => {
                                if (currentIndex+1 === steps.length) {
                                    progress.report({
                                        increment: current.increment,
                                        message: `${current.total}%`
                                    });
                                }
                            });
                    });
                    return current;
                }, {increment: 0, command: createCliCommand(''), total: 0});

                return calls.reduce<Promise<any>>((previous: Promise<any>, current: ()=>Promise<any>, index: number, calls: (()=>Promise<any>)[])=> {
                    return previous.then(current);
                }, Promise.resolve());
            });
    }

    static async execCmdWithProgress(title: string, cmd: CliCommand): Promise<any> {
        return new Promise(async (resolve, reject) => {
            await vscode.window.withProgress({
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title
                },
                async (progress: vscode.Progress<{increment: number, message: string}>, token: vscode.CancellationToken) => {
                    const result = await tknctl.getInstance().execute(cmd, process.cwd(), false);
                    result.error ? reject(result.error) : resolve();
                }
            );
        });
    }

    static async execFunctionWithProgress(title: string, func: (progress: vscode.Progress<{increment: number, message: string}>) => Promise<any> ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            await vscode.window.withProgress({
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title
                },
                async (progress: vscode.Progress<{increment: number, message: string}>, token: vscode.CancellationToken) => {
                    await func(progress).then(resolve).catch(reject);
                }
            );
        });

    }
}
