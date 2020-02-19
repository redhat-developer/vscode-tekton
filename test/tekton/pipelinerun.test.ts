/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { PipelineRun } from '../../src/tekton/pipelinerun';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineRun', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelineNamesStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelinerunItem]);
        getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
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
                await PipelineRun.list(pipelinerunItem);
                expect(termStub).calledOnceWith(Command.listPipelineRunsInTerminal(pipelinerunItem.getName()));
            });

        });

        suite('called from command palette', () => {

            test('calls the appropriate error message when no pipelinerun found', async () => {
                getPipelineNamesStub.restore();
                try {
                    await PipelineRun.list(null);
                } catch (err) {
                    expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                    return;
                }
            });
        });

        suite('called from command bar', () => {


            test('returns null when clustertask is not defined properly', async () => {
                const result = await PipelineRun.list(null);
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });

            test('skips tkn command execution if canceled by user', async () => {
                await PipelineRun.describe(null);
                // tslint:disable-next-line: no-unused-expression
                expect(termStub).not.called;
            });
        });

        suite('describe', () => {


            test('returns null when cancelled', async () => {
                const result = await PipelineRun.describe(null);

                expect(result).undefined;
            });

            test('describe calls the correct tkn command in terminal', async () => {
                await PipelineRun.describe(pipelinerunItem);
                expect(termStub).calledOnceWith(Command.describePipelineRuns(pipelinerunItem.getName()));
            });

        });

        suite('log output', () => {

            test('Log calls the correct tkn command in terminal  w/ context', async () => {
                await PipelineRun.logs(pipelinerunItem);

                expect(termStub).calledOnceWith(Command.showPipelineRunLogs(pipelinerunItem.getName()));
            });

            test('fails with no context', async () => {
                const result = await PipelineRun.logs(null);

                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });

        });

        suite('followLog', () => {

            test('followLog calls the correct tkn command in terminal', async () => {
                await PipelineRun.followLogs(pipelinerunItem);

                expect(termStub).calledOnceWith(Command.showPipelineRunFollowLogs(pipelinerunItem.getName()));
            });

        });

        suite('cancel', () => {


            test('returns undefined when cancelled', async () => {
                const result = await PipelineRun.cancel(null);
                expect(result).undefined;
            });

            test('Cancel calls the correct tkn command in terminal  w/ context', async () => {
                await PipelineRun.cancel(pipelinerunItem);

                expect(termStub).calledOnceWith(Command.cancelPipelineRun(pipelinerunItem.getName()));
            });

        });

        suite('delete command', () => {
            let warnStub: sinon.SinonStub;

            setup(() => {
                warnStub = sandbox.stub(vscode.window, 'showWarningMessage');
            });

            test('calls the appropriate tkn command if confirmed', async () => {
                warnStub.resolves('Yes');

                await PipelineRun.delete(pipelinerunItem);

                expect(execStub).calledOnceWith(Command.deletePipelineRun(pipelinerunItem.getName()));
            });

            test('returns a confirmation message text when successful', async () => {
                warnStub.resolves('Yes');

                const result = await PipelineRun.delete(pipelinerunItem);

                expect(result).equals(`The PipelineRun '${pipelinerunItem.getName()}' successfully deleted.`);
            });

            test('returns null when cancelled', async () => {
                warnStub.resolves('Cancel');

                const result = await PipelineRun.delete(pipelinerunItem);

                expect(result).null;
            });

            test('throws an error message when command failed', async () => {
                warnStub.resolves('Yes');
                execStub.rejects('ERROR');
                let expectedError;
                try {
                    await PipelineRun.delete(pipelinerunItem);
                } catch (err) {
                    expectedError = err;
                }
                expect(expectedError).equals(`Failed to delete the PipelineRun '${pipelinerunItem.getName()}': 'ERROR'.`);
            });
        });
    });
});
