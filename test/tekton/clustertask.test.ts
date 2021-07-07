/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import { ClusterTask } from '../../src/tekton/clustertask';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';
import { ContextType } from '../../src/context-type';
import { K8sTask } from '../../src/tekton';
import { PipelineWizard } from '../../src/pipeline/wizard';
import { cli } from '../../src/cli';
import * as telemetry from '../../src/telemetry';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Clustertask', () => {
  const sandbox = sinon.createSandbox();
  let osStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let tknExecStub: sinon.SinonStub;
  let cliExecStub: sinon.SinonStub;
  let pipelineWizardStub: sinon.SinonStub;
  const clustertaskNode = new TestItem(TknImpl.ROOT, 'test-clustertask', ContextType.CLUSTERTASK, null);
  const clustertaskItem = new TestItem(clustertaskNode, 'test-clustertask', ContextType.CLUSTERTASK, null);

  const clusterTask: K8sTask = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'ClusterTask',
    metadata: {
      name:'clustertask-with-optional-resources-v1alpha1'
    },
    spec: {
      params: [
        {
          default: 'README.md',
          name: 'filename'
        }
      ],
      resources: {
        inputs: [
          {
            name: 'git-repo',
            type: 'git'
          }
        ],
        outputs: [
          {
            name: 'optionalimage',
            type: 'image'
          }
        ]
      },
      workspaces: [
        {
          name: 'source'
        }
      ]
    }
  }

  const secret = [
    {
      Kind: 'Secret',
      metadata: {
        name: 'builder-dockercfg-9t5jt'
      }
    }
  ];

  const configMap = [
    {
      Kind: 'ConfigMap',
      metadata: {
        name: 'config-logging-triggers'
      }
    }
  ];

  const pvc = [
    {
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: 'output-pipeline-run-pvc'
      }
    }
  ]

  const resource = [
    {
      kind: 'resource',
      metadata: {
        name: 'test'
      }
    }
  ]

  setup(() => {
    osStub = sandbox.stub(os, 'tmpdir').resolves();
    sandbox.stub(telemetry, 'telemetryLogError');
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    tknExecStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
    cliExecStub = sandbox.stub(cli, 'execute').resolves({error: null, stdout: '', stderr: ''});
    sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([clustertaskItem]);
    pipelineWizardStub = sandbox.stub(PipelineWizard, 'create').resolves();
    sandbox.stub(TektonItem, 'getClusterTaskNames').resolves([clustertaskItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Start ClusterTask', () => {

    test('Start ClusterTask From Wizard', async () => {
      tknExecStub.onFirstCall().resolves({error: null, stdout: JSON.stringify(clusterTask), stderr: ''});
      tknExecStub.onSecondCall().resolves({error: null, stdout: JSON.stringify(secret), stderr: ''});
      tknExecStub.onThirdCall().resolves({error: null, stdout: JSON.stringify(configMap), stderr: ''});
      tknExecStub.onCall(3).resolves({error: null, stdout: JSON.stringify(pvc), stderr: ''});
      tknExecStub.onCall(4).resolves({error: null, stdout: JSON.stringify(resource), stderr: ''});
      await ClusterTask.start(clustertaskItem);
      pipelineWizardStub.calledOnce;
    });

    test('return null of no ClusterTask found in context', async () => {
      const result = await ClusterTask.start(null);
      expect(result).equals(null);
    });

    test('Start ClusterTask without wizard if param, resource and workspace is empty', async () => {
      tknExecStub.onFirstCall().resolves({error: null, stdout: JSON.stringify({
        apiVersion: 'tekton.dev/v1beta1',
        kind: 'ClusterTask',
        metadata: {
          name:'test'
        },
        spec: {}
      }), stderr: ''});
      cliExecStub.onFirstCall().resolves({error: null, stdout: JSON.stringify({
        apiVersion: 'tekton.dev/v1beta1',
        kind: 'ClusterTask',
        metadata: {
          name:'test1'
        },
        spec: {}
      }), stderr: ''});
      osStub.onFirstCall().returns('path');
      cliExecStub.onSecondCall().resolves({error: null, stdout: 'created', stderr: ''});
      await ClusterTask.start(clustertaskItem, 'cluster');
      showInformationMessageStub.calledOnce;
      osStub.calledOnce;
      unlinkStub.calledOnce;
      writeFileStub.calledOnce;
    });

    test('throw error message if fail to fetch ClusterTask info', async () => {
      tknExecStub.onFirstCall().resolves({error: 'error', stdout: '', stderr: ''});
      await ClusterTask.start(clustertaskItem);
      showErrorMessageStub.calledOnce;
    });

    test('throw error message if fail to parse json', async () => {
      tknExecStub.onFirstCall().resolves({error: '', stdout: 'test', stderr: ''});
      await ClusterTask.start(clustertaskItem, 'cluster');
      showErrorMessageStub.calledOnce;
    });
  });
});
