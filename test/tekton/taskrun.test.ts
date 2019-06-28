/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TestItem } from './testTektonitem';
import { TknImpl, Command } from '../../src/tkn';
import { Progress } from '../../src/util/progress';
import * as Util from '../../src/util/async';
import { Refs } from '../../src/util/refs';
import { TektonItem } from '../../src/tekton/tektonitem';
import pq = require('proxyquire');
import { contextGlobalState } from '../../src/extension';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/TaskRun', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let termStub: sinon.SinonStub, execStub: sinon.SinonStub;
    let getTaskRunsStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline');
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun');
    const taskrunItem = new TestItem(pipelinerunItem, 'taskrun');
    const taskItem = new TestItem(pipelinerunItem, 'task');
    const errorMessage = 'FATAL ERROR';
    let getPipelines: sinon.SinonStub;
    let getPipelineRuns: sinon.SinonStub;
    let TaskRun: any;
    let opnStub: sinon.SinonStub;
    let infoStub: sinon.SinonStub;
    let fetchTag: sinon.SinonStub;
    setup(() => {
        sandbox = sinon.createSandbox();
        opnStub = sandbox.stub();
        fetchTag = sandbox.stub(Refs, 'fetchTag').resolves (new Map<string, string>([['HEAD', 'shanumb']]));
        TaskRun = pq('../../src/tekton/taskrun', {
            open: opnStub
        }).TaskRun;
        termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal');
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ stdout: "" });
        sandbox.stub(TknImpl.prototype, 'getTaskRuns');
        sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([]);
        sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([]);
        getTaskRunsStub = sandbox.stub(TknImpl.prototype, 'getTaskRuns').resolves([]);
        sandbox.stub(Util, 'wait').resolves();
        getPipelines = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        getPipelineRuns = sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
        sandbox.stub(TektonItem, 'getTaskRunNames').resolves([taskrunItem]);
        sandbox.stub(TektonItem, 'getTaskRunNames').resolves([taskItem]);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('create taskrun with no context', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(null);
        });

        test('asks for context and exits if not provided', async () => {
            const result = await TaskRun.create(null);
            expect(result).null;
            expect(getPipelines).calledOnce;
            expect(getPipelineRuns).calledOnce;
        });
    });

    suite('create', () => {
        const taskrunType = 'nodejs';
        const version = 'latest';
        const ref = 'master';
        const folder = { uri: { fsPath: 'folder' } };
        let inputStub: sinon.SinonStub,
        progressFunctionStub: sinon.SinonStub;

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves('Workspace Directory');
            quickPickStub.onSecondCall().resolves(taskrunType);
            quickPickStub.onThirdCall().resolves(version);
            inputStub = sandbox.stub(vscode.window, 'showInputBox');
            sandbox.stub(Progress, 'execWithProgress').resolves();
            sandbox.stub(Progress, 'execCmdWithProgress').resolves();
            progressFunctionStub = sandbox.stub(Progress, 'execFunctionWithProgress').yields();
        });

        test('returns null when cancelled', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.create(pipelinerunItem);

            expect(result).null;
        });

        test('errors when a subcommand fails', async () => {
            sandbox.stub(vscode.window, 'showWorkspaceFolderPick').rejects(errorMessage);

            try {
                await TaskRun.create(pipelinerunItem);
                expect.fail();
            } catch (error) {
                expect(error).equals(`Failed to create TaskRun with error '${errorMessage}'`);
            }
        });

        suite('from local workspace', () => {
            let folderStub: sinon.SinonStub;

            setup(() => {
                inputStub.resolves(taskrunItem.getName());
                folderStub = sandbox.stub(vscode.window, 'showWorkspaceFolderPick').resolves(folder);
            });

            test('happy path works', async () => {
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully created`);
                expect(progressFunctionStub).calledOnceWith(
                    `Creating new TaskRun '${taskrunItem.getName()}'`);
                expect(termStub).calledOnceWith(Command.pushLocalTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName(), folder.uri.fsPath));
            });

            test('returns null when no folder selected', async () => {
                folderStub.resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun name selected', async () => {
                inputStub.resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type selected', async () => {
                quickPickStub.onSecondCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type version selected', async () => {
                quickPickStub.onThirdCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });
        });

        suite('from git repository', () => {
            const uri = 'git uri';
            setup(() => {
                quickPickStub.onFirstCall().resolves({ label: 'Git Repository' });
                inputStub.onFirstCall().resolves(uri);
                quickPickStub.onSecondCall().resolves('master');
                quickPickStub.onThirdCall().resolves(taskrunType);
                quickPickStub.onCall(3).resolves(version);
                inputStub.onSecondCall().resolves(taskrunItem.getName());
                infoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            });

            test('happy path works', async () => {
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully created`);
                expect(termStub).calledOnceWith(Command.createGitTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunType, version, taskrunItem.getName(), uri, ref));
            });

            test('returns null when no git repo selected', async () => {
                inputStub.onFirstCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no git reference selected', async () => {
                quickPickStub.onSecondCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun name selected', async () => {
                inputStub.onSecondCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type selected', async () => {
                quickPickStub.onCall(2).resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type version selected', async () => {
                quickPickStub.onCall(3).resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('clones the git repo if selected', async () => {
                infoStub.resolves('Yes');
                const commandStub = sandbox.stub(vscode.commands, 'executeCommand');
                await TaskRun.create(pipelinerunItem);

                expect(commandStub).calledOnceWith('git.clone', uri);
            });

            test('allows to continue with valid git repository url', async () => {
                let result: string | Thenable<string>;
                inputStub.onFirstCall().callsFake(async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Promise<string> => {
                    result = await options.validateInput('https://github.com/redhat-developer/vscode-tekton');
                    return Promise.resolve('https://github.com/redhat-developer/vscode-tekton');
                });

                await TaskRun.create(pipelinerunItem);
                expect(result).to.be.undefined;
            });

            test('shows error message when repo does not exist', async () => {
                fetchTag.resolves (new Map<string, string>());
                let result: string | Thenable<string>;
                inputStub.onFirstCall().callsFake(async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Promise<string> => {
                    result = await options.validateInput('https://github.com');
                    return Promise.resolve('https://github.com');
                });

                await TaskRun.create(pipelinerunItem);
                expect(result).equals('There is no git repository at provided URL.');
            });

            test('shows error message when invalid URL provided', async () => {
                let result: string | Thenable<string>;
                inputStub.onFirstCall().callsFake(async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Promise<string> => {
                    result = await options.validateInput('github');
                    return Promise.resolve('github');
                });

                await TaskRun.create(pipelinerunItem);
                expect(result).equals('Invalid URL provided');
            });

            test('shows error message for empty git repository url', async () => {
                let result: string | Thenable<string>;
                inputStub.onFirstCall().callsFake(async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Promise<string> => {
                    result =  await (async () => options.validateInput(''))();
                    return Promise.resolve('');
                });

                await TaskRun.create(pipelinerunItem);
                expect(result).equals('Empty Git repository URL');
            });
        });

        suite('from binary file', () => {
            let fileStub: sinon.SinonStub;
            const files = [{ fsPath: 'test/sample.war' }];

            setup(() => {
                quickPickStub.onFirstCall().resolves({ label: 'Binary File' });
                fileStub = sandbox.stub(vscode.window, 'showOpenDialog').resolves(files);
                inputStub.resolves(taskrunItem.getName());
            });

            test('happy path works', async () => {

                const result = await TaskRun.create(pipelinerunItem);

                expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully created`);
                expect(execStub).calledWith(Command.createBinaryTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunType, version, taskrunItem.getName(), files[0].fsPath));
            });

            test('returns null when no binary file selected', async () => {
                fileStub.resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun name selected', async () => {
                inputStub.resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type selected', async () => {
                quickPickStub.onSecondCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });

            test('returns null when no taskrun type version selected', async () => {
                quickPickStub.onThirdCall().resolves();
                const result = await TaskRun.create(pipelinerunItem);

                expect(result).null;
            });
        });
    });

    suite('createFromFolder', () => {
        let inputStub: sinon.SinonStub;
        const pathOne: string = path.join('some', 'path');
        const folder: vscode.Uri = vscode.Uri.file(pathOne);
        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            inputStub = sandbox.stub(vscode.window, 'showInputBox');
        });

        test('return null when no taskrun type selected', async () => {
            inputStub.resolves(taskrunItem.getName());
            const result = await TaskRun.createFromFolder(folder);
            expect(result).null;
        });

        test('return null when no taskrun name is provided', async () => {
            inputStub.resolves();
            const result = await TaskRun.createFromFolder(folder);
            expect(result).null;
        });

        test('return null when no taskrun version selected', async () => {
            inputStub.resolves(taskrunItem.getName());
            quickPickStub.onThirdCall().resolves('nodejs');
            const result = await TaskRun.createFromFolder(folder);
            expect(result).null;
        });

        test('happy path works', async () => {
            inputStub.resolves(taskrunItem.getName());
            quickPickStub.onThirdCall().resolves('nodejs');
            quickPickStub.resolves('latest');
            const result = await TaskRun.createFromFolder(folder);
            expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully created`);
        });
    });

  

    suite('linkTaskRun', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        });

        test('works from context menu', async () => {
            quickPickStub.resolves(taskrunItem);
            execStub.resolves({ error: null, stderr: "", stdout: '8080, ' });
            const result = await TaskRun.linkTaskRun(taskrunItem);

            expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully linked with TaskRun '${taskrunItem.getName()}'`);
        });

        test('works from context menu if more than one ports is available', async () => {
            getTaskRunsStub.resolves([taskrunItem, taskrunItem]);
            quickPickStub.resolves(taskrunItem);
            execStub.resolves({ error: null, stderr: "", stdout: '8080, 8081, ' });
            const result = await TaskRun.linkTaskRun(taskrunItem);

            expect(result).equals(`TaskRun '${taskrunItem.getName()}' successfully linked with TaskRun '${taskrunItem.getName()}'`);
        });

        test('returns null when no taskrun selected to link', async () => {
            quickPickStub.resolves();
            const result = await TaskRun.linkTaskRun(taskrunItem);

            expect(result).null;
        });

        test('calls the appropriate error message when only one taskrun found', async () => {
            quickPickStub.restore();
            getTaskRunsStub.resolves([taskrunItem]);
            try {
                await TaskRun.linkTaskRun(taskrunItem);
            } catch (err) {
                expect(err.message).equals('You have no TaskRuns available to link, please create new Tekton TaskRun and try again.');
                return;
            }
            expect.fail();

        });

        test('errors when no ports available', async () => {
            quickPickStub.resolves(taskrunItem);
            execStub.resolves({ error: null, stderr: "", stdout: "" });
            let savedErr: any;
            try {
                await TaskRun.linkTaskRun(taskrunItem);
            } catch (err) {
                savedErr = err;
            }

            expect(savedErr).equals(`TaskRun '${taskrunItem.getName()}' has no Ports declared.`);
        });

        test('errors when a subcommand fails', async () => {
            quickPickStub.resolves(taskrunItem);
            execStub.onFirstCall().resolves({ error: null, stderr: "", stdout: '8080, ' });
            execStub.onSecondCall().rejects(errorMessage);
            let savedErr: any;

            try {
                await TaskRun.linkTaskRun(taskrunItem);
            } catch (err) {
                savedErr = err;
            }
            expect(savedErr).equals(`Failed to link taskrun with error '${errorMessage}'`);
        });
    });

    suite('linkTaskRun with no context', () => {
        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(null);
        });

        test('asks for context and exits if not provided', async () => {
            const result = await TaskRun.linkTaskRun(null);
            expect(result).null;
            expect(quickPickStub).calledThrice;
        });
    });

    suite('linkTaskRun', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        });

        test('returns null when cancelled', async () => {
            quickPickStub.resolves();
            const result = await TaskRun.linkTaskRun(null);

            expect(result).null;
        });

        test('works from context menu', async () => {
            quickPickStub.resolves(taskItem);
            const result = await TaskRun.linkTaskRun(taskrunItem);

            expect(result).equals(`TaskRun '${taskItem.getName()}' successfully linked with TaskRun '${taskrunItem.getName()}'`);
            expect(execStub).calledOnceWith(Command.linkTaskRunTo(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName(), taskItem.getName()));
        });

        test('returns null when no task selected to link', async () => {
            quickPickStub.resolves();
            const result = await TaskRun.linkTaskRun(taskrunItem);

            expect(result).null;
        });

        test('errors when a subcommand fails', async () => {
            quickPickStub.resolves(taskrunItem);
            execStub.rejects(errorMessage);
            let savedErr: any;

            try {
                await TaskRun.linkTaskRun(taskrunItem);
            } catch (err) {
                savedErr = err;
            }
            expect(savedErr).equals(`Failed to link TaskRun with error '${errorMessage}'`);
        });
    });

    suite('linkTaskRun with no context', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
        });

        test('works from context menu', async () => {
            quickPickStub.resolves(taskItem);
            const result = await TaskRun.linkTaskRun(null);

            expect(result).equals(`TaskRun '${taskItem.getName()}' successfully linked with TaskRun '${taskrunItem.getName()}'`);
            expect(execStub).calledOnceWith(Command.linkTaskRunTo(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName(), taskItem.getName()));
        });

        test('returns null when no task selected to link', async () => {
            quickPickStub.resolves();
            const result = await TaskRun.linkTaskRun(null);

            expect(result).null;
        });

        test('errors when a subcommand fails', async () => {
            quickPickStub.resolves(taskrunItem);
            execStub.rejects(errorMessage);
            let savedErr: any;

            try {
                await TaskRun.linkTaskRun(null);
            } catch (err) {
                savedErr = err;
            }
            expect(savedErr).equals(`Failed to link TaskRun with error '${errorMessage}'`);
        });
    });

     suite('log', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
        });

        test('returns null when cancelled', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.log(null);

            expect(result).null;
        });

        test('log calls the correct tkn command in terminal', async () => {
            await TaskRun.log(taskrunItem);

            expect(termStub).calledOnceWith(Command.showTaskRunLogs(taskrunItem.getName()));
        });

        test('works with no context', async () => {
            await TaskRun.log(null);

            expect(termStub).calledOnceWith(Command.showTaskRunLogs(taskrunItem.getName()));
        });
    });

    suite('followLog', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
        });

        test('returns null when cancelled', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.followLog(null);

            expect(result).null;
        });

        test('followLog calls the correct tkn command in terminal  w/ context', async () => {
            await TaskRun.followLog(taskrunItem);

            expect(termStub).calledOnceWith(Command.showLogAndFollow(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });

        test('works with no context', async () => {
            await TaskRun.followLog(null);

            expect(termStub).calledOnceWith(Command.showLogAndFollow(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });
    });

    suite('push', () => {
        let getpushStub;

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
            getpushStub = sandbox.stub(TaskRun, 'getPushCmd').resolves(undefined);
            sandbox.stub(TaskRun, 'setPushCmd');
        });

        test('returns null when cancelled', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.push(null);

            expect(result).null;
        });

        test('push calls the correct tkn command with progress', async () => {
            await TaskRun.push(taskrunItem);

            expect(termStub).calledOnceWith(Command.pushTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });

        test('works with no context', async () => {
            await TaskRun.push(null);

            expect(termStub).calledOnceWith(Command.pushTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });

        test('works from keybinding', async () => {
            getpushStub.resolves(`tkn push ${taskrunItem.getName()} --pipelinerun ${pipelinerunItem.getName()} --pipeline ${pipelineItem.getName()}`);
            await TaskRun.push(null);

            expect(termStub).calledOnceWith(Command.pushTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });
    });

    suite('watch', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
        });

        test('returns null when cancelled', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.watch(null);

            expect(result).null;
        });

        test('calls the correct tkn command w/ context', async () => {
            await TaskRun.watch(taskrunItem);

            expect(termStub).calledOnceWith(Command.watchTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });

        test('calls the correct tkn command w/o context', async () => {
            await TaskRun.watch(null);

            expect(termStub).calledOnceWith(Command.watchTaskRun(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName()));
        });
    });

    suite('openUrl', () => {
        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
            quickPickStub.onSecondCall().resolves(pipelinerunItem);
            quickPickStub.onThirdCall().resolves(taskrunItem);
        });

        test('ask for context when called from command bar and exits with null if canceled', async () => {
            quickPickStub.onThirdCall().resolves(null);
            const result = await TaskRun.openUrl(null);
            expect(quickPickStub).calledThrice;
            expect(result).is.null;
        });

        test('gets URLs for taskrun and if there is only one opens it in browser', async () => {
            execStub.onCall(0).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(1).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(2).resolves({error: undefined, stdout: JSON.stringify({
                items: [
                    {
                        spec: {
                            path: 'url',
                            protocol: 'https',
                            port: 8080
                        }
                    }
                ]
            }), stderr: ''});
            await TaskRun.openUrl(null);
            expect(opnStub).calledOnceWith('https://url');
        });

        test('gets URLs for the taskrun and if there is more than one asks which one to open it in browser and opens selected', async () => {
            quickPickStub.onCall(3).resolves({label: 'https://url1'});
            execStub.onCall(0).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(1).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(2).resolves({error: undefined, stdout: JSON.stringify({
                items: [
                    {
                        spec: {
                            path: 'url1',
                            protocol: 'https',
                            port: 8080
                        }
                    }, {
                        spec: {
                            path: 'url2',
                            protocol: 'https',
                            port: 8080
                        }
                    }
                ]
            }), stderr: ''});
            await TaskRun.openUrl(null);
            expect(opnStub).calledOnceWith('https://url1');
        });

        test('gets URLs for the taskrun, if there is more than one asks which one to open it in browser and exits if selection is canceled', async () => {
            quickPickStub.onCall(3).resolves(null);
            execStub.onCall(0).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(1).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(2).resolves({error: undefined, stdout: JSON.stringify({
                items: [
                    {
                        spec: {
                            path: 'url1',
                            protocol: 'https',
                            port: 8080
                        }
                    }, {
                        spec: {
                            path: 'url2',
                            protocol: 'https',
                            port: 8080
                        }
                    }
                ]
            }), stderr: ''});
            await TaskRun.openUrl(null);
            expect(opnStub.callCount).equals(0);
        });

        test('request to create url for taskrun if it does not exist, creates the URL if confirmed by user and opens it in browser.' , async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves('Create');
            sandbox.stub(vscode.commands, 'executeCommand').resolves();
            execStub.onCall(0).resolves({error: undefined, stdout: '', stderr: ''});
            execStub.onCall(1).resolves({error: undefined, stdout: 'url', stderr: ''});
            execStub.onCall(2).resolves({error: undefined, stdout: JSON.stringify({
                items: [
                    {
                        spec: {
                            path: 'url',
                            protocol: 'https',
                            port: 8080
                        }
                    }
                ]
            }), stderr: ''});
            await TaskRun.openUrl(null);
            expect(opnStub).calledOnceWith('https://url');
        });

        test('request to create url for taskrun if it does not exist and exits when not confirmed' , async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves('Cancel');
            sandbox.stub(vscode.commands, 'executeCommand').resolves();
            execStub.onFirstCall().resolves({error: undefined, stdout: '', stderr: ''});
            await TaskRun.openUrl(null);
            expect(opnStub).is.not.called;
        });

        test('getTaskRunUrl returns url list for a taskrun', async () => {
            execStub.onCall(0).resolves({error: undefined, stdout: JSON.stringify({
                items: [
                    {
                        spec: {
                            path: 'url',
                            protocol: 'https',
                            port: 8080
                        }
                    }
                ]
            }), stderr: ''});
            const result = await Command.getTaskRunUrl(pipelineItem.getName(), pipelinerunItem.getName(), taskrunItem.getName());
            expect(result.length).equals(78);
        });
    });
});