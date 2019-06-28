/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command } from '../../src/tkn';
import { TestItem } from './testTektonitem';
import { Pipeline } from '../../src/tekton/pipeline';
import { TektonItem } from '../../src/tekton/tektonitem';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelinesStub: sinon.SinonStub;

    const pipelineItem = new TestItem(null, 'pipeline');
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun');
    const errorMessage = 'ERROR MESSAGE';

    setup(() => {
        sandbox = sinon.createSandbox();
        getPipelinesStub = sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: undefined, stdout: '', stderr: ''});
        sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('start(pipelineItem)', () => {
        let inputStub: sinon.SinonStub;

        setup(() => {
            inputStub = sandbox.stub(vscode.window, 'showInputBox').resolves(pipelineItem.getName());
        });

        test('works with valid inputs', async () => {
            const result = await Pipeline.start(pipelineItem);

            expect(result).equals(`Pipeline '${pipelineItem.getName()}' successfully start(pipelineItem)d`);
            expect(execStub).calledWith(Command.startPipeline(pipelineItem.getName()));
        });

        test('returns null with no pipeline name selected', async () => {
            inputStub.resolves();
            const result = await Pipeline.start(pipelineItem);

            expect(result).null;
        });

        test('wraps errors in additional info', async () => {
            execStub.rejects(errorMessage);
            try {
                await Pipeline.start(null);
                expect.fail();
            } catch (err) {
                expect(err).equals(`Failed to start(pipelineItem) Pipeline with error '${errorMessage}'`);
            }
        });

        test('validator returns undefined for valid pipeline name', async () => {
            let result: string | Thenable<string>;
            inputStub.restore();
            inputStub = sandbox.stub(vscode.window, 'showInputBox').onFirstCall().callsFake((options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string> => {
                result = options.validateInput('goodvalue');
                return Promise.resolve('goodvalue');
            });
            await Pipeline.start(pipelineItem);

            expect(result).is.undefined;
        });

        test('validator returns error message for empty pipeline name', async () => {
            let result: string | Thenable<string>;
            inputStub.restore();
            inputStub = sandbox.stub(vscode.window, 'showInputBox').onFirstCall().callsFake((options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string> => {
                result = options.validateInput('');
                return Promise.resolve('');
            });
            await Pipeline.start(pipelineItem);

            expect(result).equals('Empty Pipeline name');
        });

        test('validator returns error message for none alphanumeric pipeline name', async () => {
            let result: string | Thenable<string>;
            inputStub.restore();
            inputStub = sandbox.stub(vscode.window, 'showInputBox').onFirstCall().callsFake((options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string> => {
                result = options.validateInput('name&name');
                return Promise.resolve('name&name');
            });
            await Pipeline.start(pipelineItem);

            expect(result).equals('Not a valid Pipeline name. Please use lower case alphanumeric characters or "-", start(pipelineItem) with an alphabetic character, and end with an alphanumeric character');
        });

        test('validator returns error message if same name of pipeline found', async () => {
            let result: string | Thenable<string>;
            inputStub.restore();
            inputStub = sandbox.stub(vscode.window, 'showInputBox').onFirstCall().callsFake((options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string> => {
                result = options.validateInput('pipeline');
                return Promise.resolve('pipeline');
            });
            await Pipeline.start(pipelineItem);

            expect(result).equals('This name is already used, please enter different name.');
        });

        test('validator returns error message for pipeline name longer than 63 characters', async () => {
            let result: string | Thenable<string>;
            inputStub.restore();
            inputStub = sandbox.stub(vscode.window, 'showInputBox').onFirstCall().callsFake((options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string> => {
                result = options.validateInput('n123456789012345678901234567890123456789012345678901234567890123');
                return Promise.resolve('n123456789012345678901234567890123456789012345678901234567890123');
            });
            await Pipeline.start(pipelineItem);

            expect(result).equals('Pipeline name should be between 2-63 characters');
        });
    });
});