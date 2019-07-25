/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { ClusterTask } from '../../src/tekton/clustertask';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Clustertask', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let termStub: sinon.SinonStub;
    let getClusterTaskStub: sinon.SinonStub;
    let inputStub: sinon.SinonStub;
    const clustertaskNode = new TestItem(TknImpl.ROOT, 'test-clustertask', ContextType.CLUSTERTASK, null);
    const clustertaskItem = new TestItem(clustertaskNode, 'test-clustertask', ContextType.CLUSTERTASK, null);


    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal');
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox = sinon.createSandbox();
        getClusterTaskStub = sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([]);
        sandbox.stub(TektonItem, 'getClusterTaskNames').resolves([clustertaskItem]);
        inputStub = sandbox.stub(vscode.window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('list calls tkn clustertask list', async () => {
        await ClusterTask.list(clustertaskItem);
        expect(termStub).calledOnceWith(Command.listClusterTasks(clustertaskItem.getName()));
    });

    suite('called from command bar', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(clustertaskItem);
        });

        test('returns null when no task not defined properly', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await ClusterTask.list(null);
            // tslint:disable-next-line: no-unused-expression
            expect(result).null;
        });
    });
});
