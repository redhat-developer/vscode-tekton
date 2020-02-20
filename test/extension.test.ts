/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { PipelineRun } from '../src/tekton/pipelinerun';
import { PipelineResource } from '../src/tekton/pipelineresource';
import { TaskRun } from '../src/tekton/taskrun';
import { Pipeline } from '../src/tekton/pipeline';
import { Task } from '../src/tekton/task';
import { ClusterTask } from '../src/tekton/clustertask';
import packagejson = require('../package.json');
import { TknImpl, TektonNodeImpl, ContextType } from '../src/tkn';
import { PipelineExplorer } from '../src/pipeline/pipelineExplorer';
import { TektonItem } from '../src/tekton/tektonitem';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Pipeline Extension', async () => {
    let sandbox: sinon.SinonSandbox;
    const pipelineNode = new TektonNodeImpl(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed);
    const taskNode = new TektonNodeImpl(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed);
    const clustertaskNode = new TektonNodeImpl(TknImpl.ROOT, 'Clustertasks', ContextType.CLUSTERTASKNODE, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed);
    const pipelineItem = new TektonNodeImpl(pipelineNode, 'test-pipeline', ContextType.PIPELINE, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed);
    const pipelinerunItem = new TektonNodeImpl(pipelineItem, 'test-pipeline-1', ContextType.PIPELINERUN, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed, '2019-07-25T12:00:00Z', 'True');
    const taskrunItem = new TektonNodeImpl(pipelinerunItem, 'test-taskrun-1', ContextType.TASKRUN, TknImpl.Instance, vscode.TreeItemCollapsibleState.Collapsed, '2019-07-25T12:03:00Z', 'True');
    const taskItem = new TektonNodeImpl(taskNode, 'test-tasks', ContextType.TASK, TknImpl.Instance, vscode.TreeItemCollapsibleState.None);
    const clustertaskItem = new TektonNodeImpl(clustertaskNode, 'test-Clustertask', ContextType.CLUSTERTASK, TknImpl.Instance, vscode.TreeItemCollapsibleState.None);

    setup(async () => {
        sandbox = sinon.createSandbox();
        const stub = sandbox.stub(Pipeline, 'about');
        try {
            await vscode.commands.executeCommand('tekton.about');
        // eslint-disable-next-line no-empty
        } catch (ignore) {
        } finally {
            stub.restore();
        }
        sandbox.stub(TknImpl.prototype, '_getPipelines').resolves([pipelineItem]);
        sandbox.stub(TknImpl.prototype, '_getTasks').resolves([taskItem]);
        sandbox.stub(TknImpl.prototype, '_getClusterTasks').resolves([clustertaskItem]);
        sandbox.stub(TknImpl.prototype, '_getPipelineRuns').resolves([pipelinerunItem]);
        sandbox.stub(TknImpl.prototype, '_getTaskRuns').resolves([taskrunItem]);
    });

    teardown(() => {
        sandbox.restore();
        TknImpl.Instance.clearCache();
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('redhat.vscode-tekton-pipelines'));
    });

    async function getStaticMethodsToStub(tekton: string[]): Promise<string[]> {
        const mths: Set<string> = new Set();
        tekton.forEach(name => {
            const segs: string[] = name.split('.');
            const methName: string = segs[segs.length - 1];
            // tslint:disable-next-line: no-unused-expression
            !mths.has(methName) && mths.add(methName);
        });
        return [...mths];
    }

    test('should activate extension', async () => {
        sandbox.stub(vscode.window, 'showErrorMessage');
        const cmds: string[] = await vscode.commands.getCommands();
        const tekton: string[] = cmds.filter((item) => item.startsWith('tekton.'));
        const mths: string[] = await getStaticMethodsToStub(tekton);
        [Pipeline, Task, ClusterTask, PipelineRun, TaskRun, PipelineResource, PipelineExplorer, TektonItem].forEach((item: { [x: string]: any }) => {
            mths.forEach((name) => {
                if (item[name]) {
                    sandbox.stub(item, name).resolves();
                }
            });
        });
        tekton.forEach((item) => vscode.commands.executeCommand(item));
        // tslint:disable-next-line: no-unused-expression
        expect(vscode.window.showErrorMessage).has.not.been.called;
    });

    test('should load pipeline, task, clustertasks and pipelineresources', async () => {
        sandbox.stub(TknImpl.prototype, 'execute').resolves({error: '', stdout: ''});
        const pipelinenodes = await TknImpl.Instance.getPipelineNodes();
        expect(pipelinenodes.length).is.equals(4);
    });

    test('should load pipelineruns from pipeline folder', async () => {
        sandbox.stub(TknImpl.prototype, 'execute').resolves({error: undefined, stdout: ''});
        const pipelinerun = await TknImpl.Instance.getPipelineRuns(pipelineItem);
        expect(pipelinerun.length).is.equals(1);
    });

    test('should load taskruns from pipelinerun folder', async () => {
        sandbox.stub(TknImpl.prototype, 'execute').resolves({error: undefined, stdout: ''});
        const taskrun = await TknImpl.Instance.getTaskRuns(pipelinerunItem);
        expect(taskrun.length).is.equals(1);
    });

    test('should register all extension commands declared commands in package descriptor', async () => {
        return await vscode.commands.getCommands(true).then((commands) => {
            packagejson.contributes.commands.forEach(value => {
                // tslint:disable-next-line: no-unused-expression
                expect(commands.indexOf(value.command) > -1, `Command '${value.command}' handler is not registered during activation`).true;
            });
        });
    });

    test('sync command wrapper shows message returned from command', async () => {
        sandbox.stub(Pipeline, 'about');
        sandbox.stub(vscode.window, 'showErrorMessage');
        const simStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('tekton.about');
        // tslint:disable-next-line: no-unused-expression
        expect(simStub).not.called;
    });

    test('sync command wrapper shows message returned from command', async () => {
        const error = new Error('Message');
        sandbox.stub(Pipeline, 'refresh').throws(error);
        const semStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('tekton.explorer.refresh');
        expect(semStub).calledWith(error);
    });

    test('more command should call refresh on parent item', async () => {
        const refreshStub = sandbox.stub(PipelineExplorer.prototype, 'refresh'); 
        const parentItem = sandbox.mock(pipelineItem);
        await vscode.commands.executeCommand('_tekton.explorer.more', 42, parentItem, 'tektonPipelineExplorer');
        expect(refreshStub).calledWith(parentItem);
    });
});
