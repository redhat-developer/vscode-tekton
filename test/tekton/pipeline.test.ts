/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { Pipeline } from '../../src/tekton/pipeline';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelineStub: sinon.SinonStub;
    const pipelineNode = new TestItem(TknImpl.ROOT, 'test-pipeline', ContextType.PIPELINENODE, null);
    const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE, null);


    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
        getPipelineStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(vscode.window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    let termStub: sinon.SinonStub;

    setup(() => {
        termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

        test('executes the list tkn command in terminal', async () => {
            await Pipeline.list(pipelineItem);
            expect(termStub).calledOnceWith(Command.listPipelinesinTerminal(pipelineItem.getName()));
        });

    });

    suite('called from command palette', () => {

        test('calls the appropriate error message when no pipeline found', async () => {
            getPipelineStub.restore();
            sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
            try {
                await Pipeline.list(null);
            } catch (err) {
                expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                return;
            }
        });
    });

    suite('called from command bar', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(pipelineItem);
        });

        test('returns undefined when pipeline is not defined properly', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await Pipeline.list(null);
            // tslint:disable-next-line: no-unused-expression
            expect(result).undefined;
        });
    });
});

