/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import sinon = require('sinon');
import { TektonItem, Trigger, Workspaces } from '../../src/tekton/tektonitem';
import { TknImpl, ContextType } from '../../src/tkn';
import { TestItem } from './testTektonitem';
import { fail } from 'assert';
import { workspace, EndOfLine, TextDocument, window } from 'vscode';
import { MultiStepInput } from '../../src/util/MultiStepInput';

const expect = chai.expect;
chai.use(sinonChai);

suite('TektonItem', () => {
  const sandbox = sinon.createSandbox();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let openTextStub: sinon.SinonStub<any[], any>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  const pipelineResourceItem = new TestItem(null, 'pipelineresource', ContextType.PIPELINERESOURCE);
  const taskrunItem = new TestItem(pipelinerunItem, 'taskrun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  const taskItem = new TestItem(null, 'task', ContextType.TASK);
  const clustertaskItem = new TestItem(null, 'clustertask', ContextType.CLUSTERTASK);

  const textDocument: TextDocument = {
    uri: undefined,
    fileName: 'tmpServerConnector-server.json',
    isClosed: false,
    isDirty: false,
    isUntitled: false,
    languageId: '',
    version: 1,
    eol: EndOfLine.CRLF,
    save: undefined,
    lineCount: 33,
    lineAt: undefined,
    getText: () => '',
    getWordRangeAtPosition: undefined,
    offsetAt: undefined,
    positionAt: undefined,
    validatePosition: undefined,
    validateRange: undefined
  };

  teardown(() => {
    sandbox.restore();
  });

  suite('getPipelineNodes', () => {

    test('returns an array of pipelineNodes names for the pipeline if there is at least one pipeline', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
      const pipelinerunNames = await TektonItem.getPipelineNames(pipelineItem);
      expect(pipelinerunNames[0].getName()).equals('pipeline');

    });

    test('throws error if there are no pipelines available', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([]);
      try {
        await TektonItem.getPipelineNames(pipelineItem);
      } catch (err) {
        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
        return;
      }
      fail('should throw error in case pipelines array is empty');
    });
  });

  suite('getPipelineNames', () => {

    test('returns an array of pipelinerun names for the pipeline if there is at least one pipeline', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
      const pipelinerunNames = await TektonItem.getPipelineNames(pipelineItem);
      expect(pipelinerunNames[0].getName()).equals('pipeline');

    });

    test('throws error if there are no pipelines available', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([]);
      try {
        await TektonItem.getPipelineNames(pipelineItem);
      } catch (err) {
        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
        return;
      }
      fail('should throw error in case pipelines array is empty');
    });
  });

  suite('getPipelineRunNames', () => {

    test('returns an array of pipelinerun names for the pipeline if there is at least one pipelinerun', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelinerunItem]);
      const pipelinerunNames = await TektonItem.getPipelinerunNames(pipelineItem);
      expect(pipelinerunNames[0].getName()).equals('pipelinerun');

    });

    test('throws error if there are no pipelineruns available', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([]);
      try {
        await TektonItem.getPipelinerunNames(pipelineItem);
      } catch (err) {
        expect(err.message).equals('You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.');
        return;
      }
      fail('should throw error in case pipelineruns array is empty');
    });
  });

  suite('getTaskNames', () => {

    test('returns an array of task names for the pipelinerun if there is at least one task', async () => {
      sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
      const taskNames = await TektonItem.getTaskNames(taskItem);
      expect(taskNames[0].getName()).equals('task');

    });

    test('throws error if there are no tasks available', async () => {
      sandbox.stub(TknImpl.prototype, 'getTasks').resolves([]);
      try {
        await TektonItem.getTaskNames(taskItem);
      } catch (err) {
        expect(err.message).equals('You need at least one Task available. Please create new Tekton Task and try again.');
        return;
      }
      fail('should throw error in case tasks array is empty');
    });
  });

  suite('openInEditor', () => {

    setup(() => {
      openTextStub = sandbox.stub(workspace, 'openTextDocument').resolves(textDocument);
      sandbox.stub(window, 'showTextDocument').resolves();
    });

    test('open yaml file in editor', async () => {
      TektonItem.openInEditor(pipelineResourceItem);
      expect(openTextStub).calledOnce;
    });
  });

  suite('getTaskrunNames', () => {

    test('returns an array of taskrun names for the pipelinerun if there is at least one task', async () => {
      sandbox.stub(TknImpl.prototype, 'getTaskRunsForPipelineRun').resolves([taskrunItem]);
      const taskrunNames = await TektonItem.getTaskRunNames(pipelinerunItem);
      expect(taskrunNames[0].getName()).equals('taskrun');

    });

    test('throws error if there are no taskruns available', async () => {
      sandbox.stub(TknImpl.prototype, 'getTaskRunsForPipelineRun').resolves([]);
      try {
        await TektonItem.getTaskRunNames(pipelinerunItem);
      } catch (err) {
        expect(err.message).equals('You need at least one TaskRun available. Please create new Tekton TaskRun and try again.');
        return;
      }
      fail('should throw error in case tasks array is empty');
    });
  });

  suite('getClustertaskNames', () => {

    test('returns an array of clustertask names for the task if there is at least one task', async () => {
      sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([clustertaskItem]);
      const clustertaskNames = await TektonItem.getClusterTaskNames(clustertaskItem);
      expect(clustertaskNames[0].getName()).equals('clustertask');

    });

    test('throws error if there are no Cluster Tasks available', async () => {
      sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([]);
      try {
        await TektonItem.getClusterTaskNames(clustertaskItem);
      } catch (err) {
        expect(err.message).equals('You need at least one ClusterTask available. Please create new Tekton ClusterTask and try again.');
        return;
      }
      fail('should throw error in case clustertasks array is empty');
    });
  });


  suite('getPipelineResourceNames', () => {

    test('returns an array of pipelineresource names for the task if there is at least one task', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineResourceItem]);
      const pipelineResourceNames = await TektonItem.getPipelineResourceNames(pipelineResourceItem);
      expect(pipelineResourceNames[0].getName()).equals('pipelineresource');

    });

    test('throws error if there are no PipelineResources available', async () => {
      sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
      try {
        await TektonItem.getPipelineResourceNames(pipelineResourceItem);
      } catch (err) {
        expect(err.message).equals('You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.');
        return;
      }
      fail('should throw error in case pipelineresource array is empty');
    });
  });

  suite('start pipeline object', () => {
    let execStub: sinon.SinonStub<unknown[], unknown>;
    let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
    let showShowInputBox: sinon.SinonStub<unknown[], unknown>;
    const pipelineTrigger: Trigger[] = [{
      name: 'build-and-deploy',
      params: [{
        description: 'name of the deployment to be patched',
        name: 'deployment-name',
      }],
      resources: [{
        name: 'git-repo',
        type: 'git'
      },
      {
        name: 'image',
        type: 'image'
      }],
      serviceAcct: undefined,
      workspaces: undefined
    }];

    const serviceTrigger: Trigger[] = [{
      name: 'build-and-deploy',
      params: undefined,
      resources: undefined,
      serviceAcct: 'service',
      workspaces: undefined
    }];

    const workspace: Trigger[] = [{
      name: 'fetch-and-print-recipe',
      params: undefined,
      resources: undefined,
      serviceAcct: undefined,
      workspaces: [
        {
          name: 'password-vault'
        },
        {
          name: 'recipe-store'
        },
        {
          name: 'shared-data'
        }
      ]
    }]

    const resourceData = JSON.stringify({
      apiVersion: 'v1',
      items: [
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'PipelineResource',
          metadata: {
            name: 'api-image'
          },
          spec: {
            type: 'image'
          }
        },
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'PipelineResource',
          metadata: {
            name: 'api-repo'
          },
          spec: {
            type: 'git'
          }
        },
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'PipelineResource',
          metadata: {
            name: 'ui-image'
          },
          spec: {
            type: 'image'
          }
        },
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'PipelineResource',
          metadata: {
            name: 'ui-repo'
          },
          spec: {
            type: 'git'
          }
        }
      ]}
    )

    setup(async () => {
      showQuickPickStub = sandbox.stub(MultiStepInput.prototype, 'showQuickPick').resolves(undefined);
      showShowInputBox = sandbox.stub(MultiStepInput.prototype, 'showInputBox').resolves(undefined);
      execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    })

    test('returns pipeline start object', async () => {
      execStub.onFirstCall().resolves({error: undefined, stdout: resourceData});
      showQuickPickStub.onFirstCall().resolves({label: 'api-repo'});
      showQuickPickStub.onSecondCall().resolves({label: 'api-image'})
      showQuickPickStub.onThirdCall().resolves({label: 'deployment-name'});
      const result = await TektonItem.startObject(pipelineTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [
          {
            default: undefined,
            description: 'name of the deployment to be patched',
            name: 'deployment-name'
          }
        ],
        resources: [
          {
            name: 'git-repo',
            resourceRef: 'api-repo',
            resourceType: undefined
          },
          {
            name: 'image',
            resourceRef: 'api-image',
            resourceType: undefined
          }
        ],
        serviceAccount: undefined,
        workspaces: []
      });
    });

    test('returns pipeline start object and provide new input params', async () => {
      execStub.onFirstCall().resolves({error: undefined, stdout: resourceData});
      showQuickPickStub.onFirstCall().resolves({label: 'api-repo'});
      showQuickPickStub.onSecondCall().resolves({label: 'api-image'})
      showQuickPickStub.onThirdCall().resolves({label: '$(plus) Input New Param Value'});
      showShowInputBox.onFirstCall().resolves({label: 'params-data'})
      const result = await TektonItem.startObject(pipelineTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [
          {
            default: {
              label: 'params-data'
            },
            description: 'name of the deployment to be patched',
            name: 'deployment-name'
          }
        ],
        resources: [
          {
            name: 'git-repo',
            resourceRef: 'api-repo',
            resourceType: undefined
          },
          {
            name: 'image',
            resourceRef: 'api-image',
            resourceType: undefined
          }
        ],
        serviceAccount: undefined,
        workspaces: []
      });
    });

    test('returns pipeline start object return workspace data', async () => {
      execStub.onFirstCall().resolves({error: undefined, stdout: JSON.stringify(
        {
          apiVersion: 'v1',
          items: [
            {
              metadata: {
                name: 'secret-password'
              }
            }
          ]
        }
      )});
      execStub.onSecondCall().resolves({error: undefined, stdout: JSON.stringify(
        {
          apiVersion: 'v1',
          items: [
            {
              metadata: {
                name: 'sensitive-recipe-storage'
              }
            },
          ]
        }
      )});
      execStub.onThirdCall().resolves({error: undefined, stdout: JSON.stringify(
        {
          apiVersion: 'v1',
          items: [
            {
              metadata: {
                name: 'shared-task-storage'
              }
            },
          ]
        }
      )});
      showQuickPickStub.onFirstCall().resolves({label: 'Secret'});
      showQuickPickStub.onSecondCall().resolves({label: 'secret-password'})
      showQuickPickStub.onThirdCall().resolves({label: 'ConfigMap'});
      showQuickPickStub.onCall(3).resolves({label: 'sensitive-recipe-storage'});
      showShowInputBox.onFirstCall().resolves('brownies')
      showShowInputBox.onSecondCall().resolves('recipe.txt')
      showQuickPickStub.onCall(4).resolves({label: 'PersistentVolumeClaim'});
      showQuickPickStub.onCall(5).resolves({label: '$(plus) Add new workspace name.'});
      showShowInputBox.onThirdCall().resolves({label: 'shared-task-storage'});
      showShowInputBox.onCall(3).resolves({label: 'path'});
      const result = await TektonItem.startObject(workspace, 'pipeline');
      expect(result).deep.equals({
        name: 'fetch-and-print-recipe',
        params: [],
        resources: [],
        serviceAccount: undefined,
        workspaces: [
          {
            emptyDir: undefined,
            key: undefined,
            name: 'password-vault',
            subPath: undefined,
            value: undefined,
            workspaceName: 'secret-password',
            workspaceType: 'Secret'
          },
          {
            emptyDir:undefined,
            key: 'brownies',
            name: 'recipe-store',
            subPath: undefined,
            value: 'recipe.txt',
            workspaceName: 'sensitive-recipe-storage',
            workspaceType: 'ConfigMap'
          },
          {
            emptyDir: undefined,
            key: undefined,
            name: 'shared-data',
            subPath: {
              label: 'path'
            },
            value: undefined,
            workspaceName: 'shared-task-storage',
            workspaceType: 'PersistentVolumeClaim'
          }
        ]
      });
    });

    test('returns service to start pipeline', async () => {
      showQuickPickStub.onFirstCall().resolves({label: 'service'});
      const result = await TektonItem.startObject(serviceTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [],
        resources: [],
        serviceAccount: 'service',
        workspaces: []
      });
    });

    test('provide a step to enter new service name', async () => {
      showQuickPickStub.onFirstCall().resolves({label: '$(plus) Add New Service Account'});
      showShowInputBox.onFirstCall().resolves({label: 'service'});
      const result = await TektonItem.startObject(serviceTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [],
        resources: [],
        serviceAccount: 'service',
        workspaces: []
      });
    });
  });
});
