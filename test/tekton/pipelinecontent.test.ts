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
      params: [
        {
          description: 'name of the deployment to be patched',
          name: 'deployment-name',
        },
        {
          description: 'name of the deployment to be patched',
          name: 'test',
          default: 'value'
        }
      ],
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
        },
        {
          name: 'test'
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
      showQuickPickStub.onSecondCall().resolves({label: '$(plus) Create Pipeline Resource.'})
      showShowInputBox.onFirstCall().resolves({label: 'api-image'});
      showShowInputBox.onSecondCall().resolves('params-data');
      const result = await PipelineContent.startObject(pipelineTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [
          {
            default: 'params-data',
            description: 'name of the deployment to be patched',
            name: 'deployment-name'
          },
          {
            default: 'value',
            description: 'name of the deployment to be patched',
            name: 'test'
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
      showShowInputBox.onFirstCall().resolves('params-data')
      const result = await PipelineContent.startObject(pipelineTrigger, 'pipeline');
      expect(result).deep.equals({
        name: 'build-and-deploy',
        params: [
          {
            default: 'params-data',
            description: 'name of the deployment to be patched',
            name: 'deployment-name'
          },
          {
            default: 'value',
            description: 'name of the deployment to be patched',
            name: 'test'
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
      showQuickPickStub.onSecondCall().resolves({label: 'secret-password'});
      showQuickPickStub.onThirdCall().resolves({label: 'ConfigMap'});
      showQuickPickStub.onCall(3).resolves({label: 'sensitive-recipe-storage'});
      showShowInputBox.onFirstCall().resolves('brownies');
      showShowInputBox.onSecondCall().resolves('recipe.txt');
      showQuickPickStub.onCall(4).resolves({label: 'PersistentVolumeClaim'});
      showQuickPickStub.onCall(5).resolves({label: 'shared-task-storage'});
      showShowInputBox.onThirdCall().resolves('path');
      showQuickPickStub.onCall(6).resolves({label: 'EmptyDir'});
      const result = await PipelineContent.startObject(workspace, 'pipeline');
      expect(result).deep.equals({
        name: 'fetch-and-print-recipe',
        params: [],
        resources: [],
        serviceAccount: undefined,
        workspaces: [
          {
            key: undefined,
            name: 'password-vault',
            subPath: undefined,
            value: undefined,
            workspaceName: 'secret-password',
            workspaceType: 'Secret'
          },
          {
            key: 'brownies',
            name: 'recipe-store',
            subPath: undefined,
            value: 'recipe.txt',
            workspaceName: 'sensitive-recipe-storage',
            workspaceType: 'ConfigMap'
          },
          {
            key: undefined,
            name: 'shared-data',
            subPath: 'path',
            value: undefined,
            workspaceName: 'shared-task-storage',
            workspaceType: 'PersistentVolumeClaim'
          },
          {
            key: undefined,
            name: 'test',
            subPath: undefined,
            value: undefined,
            workspaceName: undefined,
            workspaceType: 'EmptyDir'
          }
        ]
      });
    });

    test('return error if input is wrong', async () => {
      const result = await PipelineContent.validateInput('s@');
      expect(result).equals('invalid');
    });

    test('return undefined if input is correct', async () => {
      const result = await PipelineContent.validateInput('text');
      expect(result).equals(undefined);
    });

    test('return invalid if input text is wrong', async () => {
      const result = await PipelineContent.validateTextAndFileName('s@');
      expect(result).equals('invalid');
    });

    test('return undefined if input text is valid', async () => {
      const result = await PipelineContent.validateTextAndFileName('path');
      expect(result).equals(undefined);
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
