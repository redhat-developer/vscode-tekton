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

    test('list calls tkn task list', () => {
        TaskRun.list(taskItem);

        expect(execStub).calledOnceWith(Command.listTasks(taskItem.getName()));
    });

    suite('called from command bar', () => {

        setup(() => {
            quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves(taskItem);
        });

        test('returns null when no task not defined properly', async () => {
            quickPickStub.onFirstCall().resolves();
            const result = await TaskRun.list(null);

            expect(result).null;
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
});
