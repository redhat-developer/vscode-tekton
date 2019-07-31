/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { PipelineRun } from '../../src/tekton/pipelinerun';
import { Pipeline } from '../../src/tekton/pipeline';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';
import { doesNotThrow } from 'assert';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineRun', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelineNamesStub: sinon.SinonStub;
    let inputStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelinerunItem]);
        getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
        inputStub = sandbox.stub(vscode.window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('called from command bar', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
        });

        test('returns the appropriate error message when no pipelines available', async () => {
            quickPickStub.restore();
            getPipelineNamesStub.restore();
            sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([]);
            sandbox.stub(vscode.window, 'showErrorMessage');
            try {
                await Pipeline.start(null);
            } catch (err) {
                expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                return;
            }
            expect.fail();

        });

    });

    suite('describe command', () => {
        let termStub: sinon.SinonStub;

        setup(() => {
            termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
        });

        suite('called from \'Tekton PipelineRun Explorer\'', () => {

            test('executes the pipelinerun appropriate tkn command in terminal', async (done) => {
                await PipelineRun.describe(pipelinerunItem);

              expect(termStub).calledOnceWith(Command.describePipelineRuns(pipelinerunItem.getName()));
              done();
            });
        });

        suite('called from command palette', () => {

            test('calls the pipelinerun appropriate error message when no pipeline found', async () => {
                getPipelineNamesStub.restore();
                sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([]);
                try {
                    await PipelineRun.describe(null);
                } catch (err) {
                    expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                    return;
                }
                expect.fail();

            });

            test('asks to select a pipeline and a pipelinerun', async (done) => {
                const pipelines = Promise.resolve([pipelineItem]);
                const pipelineruns = Promise.resolve([pipelinerunItem]);
                quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
                quickPickStub.onFirstCall().resolves(pipelineItem);
                quickPickStub.onSecondCall().resolves(pipelinerunItem);

                await PipelineRun.describe(null);

                expect(quickPickStub).calledWith(pipelines, { placeHolder: "From which pipeline you want to describe PipelineRun" });
                expect(quickPickStub).calledWith(pipelineruns, { placeHolder: "Select PipelineRun you want to describe" });
                done();
            });

            test('skips tkn command execution if canceled by user', async () => {
                quickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(null);
                await PipelineRun.describe(null);
                expect(termStub).not.called;
            });
        });

        suite('log output', () => {
            setup(() => {
                sandbox = sinon.createSandbox();
                execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
                sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelinerunItem]);
                getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
                sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
                inputStub = sandbox.stub(vscode.window, 'showInputBox');
            });
   
            test('returns null when cancelled', async () => {
                quickPickStub.onFirstCall().resolves();
                const result = await PipelineRun.logs(null);
    
                expect(result).null;
            });
    
            test('Log calls the correct tkn command in terminal  w/ context', async () => {
                await PipelineRun.logs(pipelinerunItem);
    
                expect(termStub).calledOnceWith(Command.showPipelineRunLogs(pipelinerunItem.getName()));
            });
    
            test('works with no context', async () => {
                await PipelineRun.logs(null);
    
                expect(termStub).calledOnceWith(Command.showPipelineRunLogs(pipelinerunItem.getName()));
            });
        });
    });
});
