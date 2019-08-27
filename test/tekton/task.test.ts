/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { Task } from '../../src/tekton/task';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Task', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getTaskStub: sinon.SinonStub;
    const taskNode = new TestItem(TknImpl.ROOT, 'test-task', ContextType.TASKNODE, null);
    const taskItem = new TestItem(taskNode, 'task', ContextType.TASK, null);


    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
        getTaskStub = sandbox.stub(TektonItem, 'getTaskNames').resolves([taskItem]);
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
            await Task.list(taskItem);
            expect(termStub).calledOnceWith(Command.listTasksinTerminal("default"));
        });

    });

    suite('called from command palette', () => {

        test('calls the appropriate error message when no task found', async () => {
            getTaskStub.restore();
            sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
            try {
                await Task.list(null);
            } catch (err) {
                expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                return;
            }
        });
    });

    suite('called from command bar', () => {

        test('returns undefined when task is not defined properly', async () => {
            const result = await Task.list(null);
            // tslint:disable-next-line: no-unused-expression
            expect(result).undefined;
        });
    });
});

