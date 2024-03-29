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
import { TknImpl, tkn } from '../src/tkn';
import { PipelineExplorer } from '../src/pipeline/pipelineExplorer';
import { TektonItem } from '../src/tekton/tektonitem';
import { ToolsConfig } from '../src/tools';
import { ContextType } from '../src/context-type';
import { TektonNodeImpl } from '../src/tree-view/tekton-node';
import { DebugExplorer } from '../src/debugger/debugExplorer';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Pipeline Extension', () => {
  const sandbox = sinon.createSandbox();
  const pipelineNode = new TektonNodeImpl(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE, tkn, vscode.TreeItemCollapsibleState.Collapsed);
  const taskNode = new TektonNodeImpl(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE, tkn, vscode.TreeItemCollapsibleState.Collapsed);
  const clustertaskNode = new TektonNodeImpl(TknImpl.ROOT, 'Clustertasks', ContextType.CLUSTERTASKNODE, tkn, vscode.TreeItemCollapsibleState.Collapsed);
  const pipelineItem = new TektonNodeImpl(pipelineNode, 'test-pipeline', ContextType.PIPELINE, tkn, vscode.TreeItemCollapsibleState.Collapsed);
  const pipelinerunItem = new TektonNodeImpl(pipelineItem, 'test-pipeline-1', ContextType.PIPELINERUN, tkn, vscode.TreeItemCollapsibleState.Collapsed, '2019-07-25T12:00:00Z', 'True');
  const taskItem = new TektonNodeImpl(taskNode, 'test-tasks', ContextType.TASK, tkn, vscode.TreeItemCollapsibleState.None);
  const clustertaskItem = new TektonNodeImpl(clustertaskNode, 'test-Clustertask', ContextType.CLUSTERTASK, tkn, vscode.TreeItemCollapsibleState.None);
  let executeStub: sinon.SinonStub;

  setup(async () => {
    sandbox.stub(ToolsConfig, 'detectOrDownload').resolves('foo');
    //Activate extension
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
    executeStub = sandbox.stub(TknImpl.prototype, 'execute');
  });

  teardown(() => {
    sandbox.restore();
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
    sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    const cmds: string[] = await vscode.commands.getCommands();
    const tekton: string[] = cmds.filter((item) => item.startsWith('tekton.'));
    const mths: string[] = await getStaticMethodsToStub(tekton);
    [Pipeline, Task, ClusterTask, PipelineRun, TaskRun, PipelineResource, PipelineExplorer, TektonItem, DebugExplorer].forEach((item: { [x: string]: any }) => {
      mths.forEach((name) => {
        if (item[name]) {
          sandbox.stub(item, name).resolves();
        }
      });
    });
    tekton.forEach((item) => vscode.commands.executeCommand(item));
  });

  test('should load pipeline, task, clustertasks and pipelineresources', async () => {
    executeStub.onFirstCall().resolves({ error: '', stdout: JSON.stringify({
      clientVersion: {
        'major': '1'
      }
    })});
    executeStub.resolves({ error: '', stdout: '' });
    const pipelinenodes = await tkn.getPipelineNodes();
    expect(pipelinenodes.length).equals(11);
  });

  test('should load pipelineruns from pipeline folder', async () => {
    executeStub.resolves({ error: undefined, stdout: '' });
    const pipelinerun = await tkn.getPipelineRuns(pipelineItem);
    expect(pipelinerun.length).is.equals(1);
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
    sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    const simStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
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
    await vscode.commands.executeCommand('_tekton.explorer.more', 42, parentItem, 'tektonPipelineExplorerView');
    expect(refreshStub).calledWith(parentItem);
  });
});
