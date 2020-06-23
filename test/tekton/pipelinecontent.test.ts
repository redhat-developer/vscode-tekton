/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import sinon = require('sinon');
import { TknImpl } from '../../src/tkn';
import { multiStepInput } from '../../src/util/MultiStepInput';
import { Trigger, PipelineContent } from '../../src/tekton/pipelinecontent';

const expect = chai.expect;
chai.use(sinonChai);

suite('PipelineContent', () => {
  const sandbox = sinon.createSandbox();


  teardown(() => {
    sandbox.restore();
  });

  suite('start pipeline object', () => {
    let execStub: sinon.SinonStub<unknown[], unknown>;
    let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
    let showShowInputBox: sinon.SinonStub<unknown[], unknown>;
    const pipelineTrigger: Trigger[] = [{
      name: 'build-and-deploy',
      parameters: [{
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
      parameters: undefined,
      resources: undefined,
      serviceAcct: 'service',
      workspaces: undefined
    }];

    const workspace: Trigger[] = [{
      name: 'fetch-and-print-recipe',
      parameters: undefined,
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
      showQuickPickStub = sandbox.stub(multiStepInput, 'showQuickPick').resolves(undefined);
      showShowInputBox = sandbox.stub(multiStepInput, 'showInputBox').resolves(undefined);
      execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    })

    test('returns pipeline start object', async () => {
      execStub.onFirstCall().resolves({error: undefined, stdout: resourceData});
      showQuickPickStub.onFirstCall().resolves({label: 'api-repo'});
      showQuickPickStub.onSecondCall().resolves({label: 'api-image'})
      showQuickPickStub.onThirdCall().resolves({label: 'deployment-name'});
      const result = await PipelineContent.startObject(pipelineTrigger, 'pipeline');
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
      const result = await PipelineContent.startObject(pipelineTrigger, 'pipeline');
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
      const result = await PipelineContent.startObject(workspace, 'pipeline');
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
      const result = await PipelineContent.startObject(serviceTrigger, 'pipeline');
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
      const result = await PipelineContent.startObject(serviceTrigger, 'pipeline');
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
