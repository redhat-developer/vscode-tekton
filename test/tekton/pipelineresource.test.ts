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
import { PipelineResource } from '../../src/tekton/pipelineresource';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineResource', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelineNamesStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
    const pipelineresourceItem = new TestItem(pipelineItem, 'pipelineresource', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineresourceItem]);
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
                await PipelineResource.list(pipelineresourceItem);
                expect(termStub).calledOnceWith(Command.listPipelineResourcesInTerminal(pipelineresourceItem.getName()));
            });

        });

        suite('called from command palette', () => {

            test('calls the appropriate error message when no pipelineresource found', async () => {
                getPipelineNamesStub.restore();
                sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([]);
                try {
                    await PipelineResource.list(null);
                } catch (err) {
                    expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                    return;
                }
            });
        });

        suite('called from command bar', () => {

            test('returns null when clustertask is not defined properly', async () => {
                const result = await PipelineResource.list(null);
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });

            test('skips tkn command execution if canceled by user', async () => {
                await PipelineResource.describe(null);
                // tslint:disable-next-line: no-unused-expression
                expect(termStub).not.called;
            });
        });

        suite('describe', () => {

            test('returns null when cancelled', async () => {
                const result = await PipelineResource.describe(null);
    
                expect(result).undefined;
            });
    
            test('describe calls the correct tkn command in terminal', async () => {
                await PipelineResource.describe(pipelineresourceItem);
                expect(termStub).calledOnceWith(Command.describePipelineResource(pipelineresourceItem.getName()));
            });
    
        });

        suite('delete command', () => {
            let warnStub: sinon.SinonStub;
    
            setup(() => {
                warnStub = sandbox.stub(vscode.window, 'showWarningMessage');
            });
    
            test('calls the appropriate tkn command if confirmed', async () => {
                warnStub.resolves('Yes');
    
                await PipelineResource.delete(pipelineresourceItem);
    
                expect(execStub).calledOnceWith(Command.deletePipelineResource(pipelineresourceItem.getName()));
            });
    
            test('returns a confirmation message text when successful', async () => {
                warnStub.resolves('Yes');
    
                const result = await PipelineResource.delete(pipelineresourceItem);
    
                expect(result).equals(`The Resource '${pipelineresourceItem.getName()}' successfully deleted.`);
            });
    
            test('returns null when cancelled', async() => {
                warnStub.resolves('Cancel');
    
                const result = await PipelineResource.delete(pipelineresourceItem);
    
                expect(result).null;
            });
    
            test('throws an error message when command failed', async () => {
                warnStub.resolves('Yes');
                execStub.rejects('ERROR');
                let expectedError;
                try {
                    await PipelineResource.delete(pipelineresourceItem);
                } catch (err) {
                    expectedError = err;
                }
                expect(expectedError).equals(`Failed to delete the Resource '${pipelineresourceItem.getName()}': 'ERROR'.`);
            });
        });
   
    });
});
