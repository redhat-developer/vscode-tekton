/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { referenceOfTaskAndClusterTaskInCluster } from '../../src/util/check-ref-resource';
import { Command } from '../../src/cli-command';
import { TestItem } from '../tekton/testTektonitem';
import { TknImpl } from '../../src/tkn';
import { ContextType } from '../../src/context-type';
import { getPipelineList } from '../../src/util/list-tekton-resource';
import { ToolsConfig } from '../../src/tools';



const expect = chai.expect;
chai.use(sinonChai);

suite('Reference Task/ClusterTask', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  const taskNode = new TestItem(TknImpl.ROOT, 'Tasks', ContextType.TASK, null);
  const clusterTaskNode = new TestItem(TknImpl.ROOT, 'ClusterTasks', ContextType.CLUSTERTASKNODE);
  const taskItem = new TestItem(taskNode, 'update-deployment', ContextType.TASK, null);
  const clusterTaskItem = new TestItem(clusterTaskNode, 'update-deployments', ContextType.CLUSTERTASK, null);

  const pipelineList = [
    {
      kind: 'Pipeline',
      apiVersion: 'tekton.dev/v1alpha1',
      metadata: {
        name: 'Pipeline1',
      },
      spec: {
        tasks: [
          {
            taskRef: {
              kind: 'ClusterTask',
              name: 'git-clone'
            }
          }
        ]
      }
    },
    {
      kind: 'Pipeline',
      apiVersion: 'tekton.dev/v1alpha1',
      metadata: {
        name: 'Pipeline2',
      },
      spec: {
        tasks: [
          {
            taskRef: {
              kind: 'Task',
              name: 'update-deployment'
            }
          }
        ]
      }
    }
  ];

  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves();
    sandbox.stub(ToolsConfig, 'getTknLocation').returns('kubectl');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('getTaskRunResourceList returns items from tkn list command', async () => {
    execStub.onFirstCall().resolves({
      error: null,
      stdout: JSON.stringify({
        'items': pipelineList
      })
    });
    const result = await getPipelineList();

    expect(execStub).calledOnceWith(Command.listPipelines());
    expect(result.length).equals(2);
  });

  test('return true if taskRef found', async () => {

    const result = referenceOfTaskAndClusterTaskInCluster(taskItem, pipelineList);
    expect(result).equals(true);
  });

  test('return false if taskRef found', async () => {

    const result = referenceOfTaskAndClusterTaskInCluster(clusterTaskItem, pipelineList);
    expect(result).equals(false);
  });
});
