/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { CliImpl } from '../../src/cli';
import { getTaskRunResourceList, referenceOfTaskAndClusterTaskInCluster } from '../../src/util/check-ref-resource';
import { Command } from '../../src/cli-command';
import { TestItem } from '../tekton/testTektonitem';
import { TknImpl } from '../../src/tkn';
import { ContextType } from '../../src/context-type';



const expect = chai.expect;
chai.use(sinonChai);

suite('Reference Task/ClusterTask', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  const taskNode = new TestItem(TknImpl.ROOT, 'Tasks', ContextType.TASK, null);
  const taskItem = new TestItem(taskNode, 'update-deployment', ContextType.TASK, null);
  const taskItem1 = new TestItem(taskNode, 'update-deployments', ContextType.TASK, null);

  const taskRunList = [
    {
      'kind': 'TaskRun',
      'apiVersion': 'tekton.dev/v1alpha1',
      'metadata': {
        'name': 'taskRun1',
      },
      spec: {
        'taskRef': {
          'kind': 'Task',
          'name': 'update-deployment'
        }
      }
    },
    {
      'kind': 'TaskRun',
      'apiVersion': 'tekton.dev/v1alpha1',
      'metadata': {
        'name': 'taskrun2',
      },
      spec: {
        'taskRef': {
          'kind': 'Task',
          'name': 'test'
        }
      }
    }
  ];

  setup(() => {
    execStub = sandbox.stub(CliImpl.prototype, 'execute').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('getTaskRunResourceList returns items from tkn list command', async () => {
    execStub.onFirstCall().resolves({
      error: null,
      stdout: JSON.stringify({
        'items': taskRunList
      })
    });
    const result = await getTaskRunResourceList();

    expect(execStub).calledOnceWith(Command.listTaskRun());
    expect(result.length).equals(2);
  });

  test('return true if taskRef found', async () => {

    const result = referenceOfTaskAndClusterTaskInCluster(taskItem, taskRunList);
    expect(result).equals(true);
  });

  test('return false if taskRef found', async () => {

    const result = referenceOfTaskAndClusterTaskInCluster(taskItem1, taskRunList);
    expect(result).equals(false);
  });
});
