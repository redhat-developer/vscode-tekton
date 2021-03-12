/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { cli } from '../../src/cli';
import { getPipelineRun } from '../../src/tekton/start-pipeline-from-json';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/startPipeline', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;

  const formValue = {
    name: 'build-and-deploy',
    params: [
      {
        default: 'test',
        name: 'deployment-name'
      }
    ],
    resources: [{
      name: 'test',
      resourceRef: 'test'
    }],
    workspaces: [
      {
        item: [],
        name: 'password-vault',
        workspaceName: 'secret-password',
        workspaceType: 'Secret'
      },
      {
        item: [],
        name: 'recipe-store',
        workspaceName: 'sensitive-recipe-storage',
        workspaceType: 'ConfigMap'
      },
      {
        item: [],
        name: 'test',
        workspaceType: 'EmptyDirectory'
      }
    ],
    serviceAccount: 'default',
    volumeClaimTemplate: [
      {
        kind: 'volumeClaimTemplate',
        metadata: {
          name: 'shared-workspace'
        },
        spec: {
          accessModes: [
            'ReadWriteOnce'
          ],
          resources: {
            requests: {
              storage: '1Mi'
            }
          }
        }
      }
    ]
  }

  setup(() => {
    sandbox.stub(vscode.window, 'showInputBox').resolves();
    execStub = sandbox.stub(cli, 'execute').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('successfully start pipeline', async () => {
    execStub.onFirstCall().resolves({
      error: undefined,
      stderr: '',
      stdout: JSON.stringify({
        apiVersion: 'tekton.dev/v1beta1',
        metadata: {
          name: 'build-and-deploy',
          namespace: 'pipelines-tutorial'
        }
      })
    })
    const result = await getPipelineRun(formValue);
    expect(result).deep.equals({
      apiVersion: 'tekton.dev/v1beta1',
      kind: 'PipelineRun',
      metadata: {
        generateName: 'build-and-deploy-',
        namespace: 'pipelines-tutorial'
      },
      spec: {
        params: [{
          name: 'deployment-name',
          value: 'test'
        }],
        pipelineRef: {
          name: 'build-and-deploy'
        },
        resources: [
          {
            name: 'test',
            resourceRef: {
              name: 'test'
            }
          }
        ],
        serviceAccountName: 'default',
        status: null,
        workspaces: [
          {
            name: 'password-vault',
            secret: {
              items: [],
              secretName: 'secret-password'
            }
          },
          {
            configMap: {
              items: [],
              name: 'sensitive-recipe-storage'
            },
            name: 'recipe-store'
          },
          {
            emptyDir: {},
            name: 'test'
          },
          {
            name: 'shared-workspace',
            volumeClaimTemplate: {
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                  requests: {
                    storage:'1Mi'
                  }
                }
              }
            }
          }
        ]
      }
    });
  });

})

