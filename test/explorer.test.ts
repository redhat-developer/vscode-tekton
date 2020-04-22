/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { PipelineExplorer } from '../src/pipeline/pipelineExplorer';
import { TknImpl, ContextType } from '../src/tkn';
import { TestItem } from './tekton/testTektonitem';
import sinon = require('sinon');

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Application Explorer', () => {
  let tektonInstance: PipelineExplorer;
  const pipelineNode = new TestItem(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE);
  const taskNode = new TestItem(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE);
  const clusterTaskNode = new TestItem(TknImpl.ROOT, 'ClusterTasks', ContextType.CLUSTERTASKNODE);
  const pipelineResourceNode = new TestItem(TknImpl.ROOT, 'PipelineResources', ContextType.PIPELINERESOURCENODE);
  const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE);
  const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN);
  const pipelineResourceItem = new TestItem(pipelineResourceNode, 'pipelineresource', ContextType.PIPELINERESOURCE);
  const taskrunItem = new TestItem(pipelinerunItem, 'taskrun', ContextType.TASKRUN);
  const taskItem = new TestItem(taskNode, 'task', ContextType.TASK);
  const clustertaskItem = new TestItem(clusterTaskNode, 'clustertask', ContextType.CLUSTERTASK);
  const sandbox = sinon.createSandbox();

  setup(() => {
    tektonInstance = new PipelineExplorer();
    sandbox.stub(TknImpl.prototype, 'getPipelineNodes').resolves([pipelineNode]);
    sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
    sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
    sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([clustertaskItem]);
    sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineResourceItem]);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('delegate calls to TektonObject instance', async () => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({
      error: '',
      stdout: ''
    });
    pipelineNode.getChildren().push(pipelineItem);
    taskNode.getChildren().push(taskItem);
    clusterTaskNode.getChildren().push(clustertaskItem);
    pipelineItem.getChildren().push(pipelinerunItem);
    pipelinerunItem.getChildren().push(taskrunItem);
    taskrunItem.getChildren().push(taskItem);
    const pipelineNodes = await tektonInstance.getChildren();
    expect(pipelineNodes.length).equals(1);
    pipelineNodes.forEach((value) => 
      expect(value.getName()).oneOf(['Pipelines', 'Tasks', 'ClusterTasks','PipelineResources', 'TriggerTemplates', 'TriggerBinding', 'EventListener', 'Conditions']));
    const pipelinetest = await tektonInstance.getChildren(pipelineNode);
    expect(pipelinetest[0]).equals(pipelineItem);
    const tasktest = await tektonInstance.getChildren(taskNode);
    expect(tasktest[0]).equals(taskItem);
    const clustertasktest = await tektonInstance.getChildren(clusterTaskNode);
    expect(clustertasktest[0]).equals(clustertaskItem);
    const pipelineruns = await tektonInstance.getChildren(pipelineItem);
    expect(pipelineruns[0]).equals(pipelinerunItem);
    const taskruns = await tektonInstance.getChildren(pipelinerunItem);
    expect(taskruns[0]).equals(taskrunItem);
    expect(tektonInstance.getParent(pipelinerunItem)).equals(pipelineItem);
    expect(tektonInstance.getTreeItem(taskrunItem)).equals(taskrunItem);
    expect(tektonInstance.getTreeItem(pipelinerunItem)).equals(pipelinerunItem);
    expect(tektonInstance.getTreeItem(clustertaskItem)).equals(clustertaskItem);
    expect(tektonInstance.getTreeItem(pipelineItem)).equals(pipelineItem);
    expect(tektonInstance.getTreeItem(taskItem)).equals(taskItem);
  });
});
