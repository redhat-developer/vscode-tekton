/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TestItem } from './testTektonitem';
import { TaskRun } from '../../src/tekton/taskrun';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { TektonItem } from '../../src/tekton/tektonitem';
import { AssertionError } from 'assert';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/TaskRun', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getTaskRunsStub: sinon.SinonStub;
    let getPipelineRunNamesStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");
    const taskrunItem = new TestItem(pipelinerunItem, 'taskrun', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ stdout: "" });
        sandbox.stub(TknImpl.prototype, 'getTaskRuns').resolves([taskrunItem]);
        getPipelineRunNamesStub = sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
        sandbox.stub(vscode.window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('list command', async () => {
        let termStub: sinon.SinonStub;

        setup(() => {
            termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
        });

        suite('called from \'Tekton Pipelines Explorer\'', () => {

            test('executes the list tkn command in terminal', async () => {
                await TaskRun.list(taskrunItem);
                expect(termStub).calledOnceWith(Command.listTaskRunsInTerminal("default"));
            });

        });

        suite('called from command palette', () => {

            test('calls the appropriate error message when no project found', async () => {
                getPipelineRunNamesStub.restore();
                sandbox.stub(TknImpl.prototype, 'getPipelineRunChildren').resolves([]);
                try {
                    await TaskRun.list(null);
                } catch (err) {
                    expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                    return;
                }
            });
        });

        suite('called from command bar', () => {

            setup(() => {
                quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
                quickPickStub.onFirstCall().resolves(taskrunItem);
            });

            test('returns null when clustertask is not defined properly', async () => {
                quickPickStub.onFirstCall().resolves();
                const result = await TaskRun.list(null);
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });

            test('skips tkn command execution if canceled by user', async () => {
                quickPickStub.resolves(null);
                await TaskRun.list(null);
                // tslint:disable-next-line: no-unused-expression
                expect(termStub).not.called;
            });
            teardown(() => {
                quickPickStub.restore();
                termStub.restore();
            });
        });

        suite('listFromTasks command', async () => {
            const taskItem = new TestItem(null, 'task', ContextType.TASK);
            const clustertaskItem = new TestItem(null, 'clustertask', ContextType.CLUSTERTASK);
    
            setup(() => {
                getTaskRunsStub = sandbox.stub(TektonItem, 'getTaskRunNames').resolves([taskrunItem]);
            });
    
            suite('called from \'Tekton Pipelines Explorer\'', () => {
    
                test('executes the listFromTasks tkn command in terminal', async () => {
                    await TaskRun.listFromTask(taskItem);
                    expect(termStub).calledOnceWith(Command.listTaskRunsforTasksinTerminal(taskItem.getName()));
                });
    
            });
    
            suite('called from command palette', () => {
    
                test('calls the appropriate error message when no project found', async () => {
                    getTaskRunsStub.restore();
                    sandbox.stub(TknImpl.prototype, 'getTaskRunsforTasks').resolves([]);
                    try {
                        await TaskRun.listFromTask(null);
                    } catch (err) {
                        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                        return;
                    }
                });
            });
    
            suite('called from command bar', () => {
    
                setup(() => {
                    quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
                    quickPickStub.onFirstCall().resolves(taskrunItem);
                });
    
                test('returns null when clustertask is not defined properly', async () => {
                    quickPickStub.onFirstCall().resolves();
                    const result = await TaskRun.listFromTask(null);
                    // tslint:disable-next-line: no-unused-expression
                    expect(result).undefined;
                });
    
                test('skips tkn command execution if canceled by user', async () => {
                    quickPickStub.resolves(null);
                    await TaskRun.listFromTask(null);
                    // tslint:disable-next-line: no-unused-expression
                    expect(termStub).not.called;
                });
                teardown(() => {
                    quickPickStub.restore();
                });
            });
        });
    

        suite('log output', () => {
   
            setup(() => {
                quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
                quickPickStub.onFirstCall().resolves(taskrunItem);
            });

            test('returns undefined when cancelled', async () => {
                quickPickStub.onFirstCall().resolves();
                const result = await TaskRun.logs(null);
    
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });
    
            test('Log calls the correct tkn command in terminal  w/ context', async () => {
                await TaskRun.logs(taskrunItem);
    
                expect(termStub).calledOnceWith(Command.showTaskRunLogs(taskrunItem.getName()));
                termStub.restore();
            });
    
            test('fails with no context', async () => {
                const result = await TaskRun.logs(null);
    
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });
        });
    });
});
