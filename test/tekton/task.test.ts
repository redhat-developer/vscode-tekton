/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command } from '../../src/tkn';
import { Task } from '../../src/tekton/task';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import { Platform } from '../../src/util/platform';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Catalog', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getTaskNamesStub: sinon.SinonStub;
    let inputStub: sinon.SinonStub;
    const taskItem = new TestItem(null, 'task');


    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
        getTaskNamesStub = sandbox.stub(TektonItem, 'getTaskNames').resolves([taskItem]);
        sandbox.stub(TektonItem, 'getTaskNames').resolves([taskItem]);
        inputStub = sandbox.stub(vscode.window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('list calls tkn task list', () => {
        Task.list(taskItem);

        expect(execStub).calledOnceWith(Command.listTasks(taskItem.getName()));
    });

    suite('called from command bar', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(taskItem);
        });

        test('returns null when no task not defined properly', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await Task.list(null);

            expect(result).null;
        });
    });
});
