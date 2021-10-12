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
import * as vscode from 'vscode';
import * as telemetry from '../../src/telemetry';
import { startTaskOrClusterTaskFromJson } from '../../src/tekton/start-task-or-clustertask-from-yaml';
import { StartObject } from '../../src/tekton';
import { TknImpl } from '../../src/tkn';

const expect = chai.expect;
chai.use(sinonChai);


suite('Tekton/Start Task|ClusterTask', () => {
  const sandbox = sinon.createSandbox();
  let cliExecStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;

  const formValue: StartObject = {
    commandId: 'tekton.clusterTask.start',
    name: 'test',
    newPipelineResource: [],
    newPvc: [],
    params: [
      {
        name: 'test',
        value: 'test'
      }
    ],
    serviceAccount: 'test',
    resources: [],
    volumeClaimTemplate: [],
    workspaces: []
  }

  setup(() => {
    osStub = sandbox.stub(os, 'tmpdir').resolves();
    sandbox.stub(telemetry, 'telemetryLogError');
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    cliExecStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('get TaskRun Json to start ClusterTask or Task', async () => {
    cliExecStub.onFirstCall().resolves({error: 'error', stdout: '', stderr: ''});
    const result = await startTaskOrClusterTaskFromJson(formValue);
    showErrorMessageStub.calledOnce;
    expect(result).equals(null);
  });

  test('throw error message if fail to parse json', async () => {
    cliExecStub.onFirstCall().resolves({error: '', stdout: 'test', stderr: ''});
    const result = await startTaskOrClusterTaskFromJson(formValue);
    showErrorMessageStub.calledOnce;
    expect(result).equals(null);
  });

  test('Start ClusterTask without wizard if param, resource and workspace is empty', async () => {
    cliExecStub.onFirstCall().resolves({error: null, stdout: JSON.stringify({
      apiVersion: 'tekton.dev/v1beta1',
      kind: 'ClusterTask',
      metadata: {
        name:'test1'
      },
      spec: {
      }
    }), stderr: ''});
    osStub.onFirstCall().returns('path');
    cliExecStub.onSecondCall().resolves({error: null, stdout: 'created', stderr: ''});
    await startTaskOrClusterTaskFromJson(formValue);
    showInformationMessageStub.calledOnce;
    osStub.calledOnce;
    unlinkStub.calledOnce;
    writeFileStub.calledOnce;
  });
});
