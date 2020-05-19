/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { save } from '../../src/tekton/save';
import { contextGlobalState } from '../../src/extension';
import { cli } from '../../src/cli';
import { pipelineExplorer } from '../../src/pipeline/pipelineExplorer';
import { tektonYaml } from '../../src/yaml-support/tkn-yaml';
import { Command, newK8sCommand } from '../../src/tkn';

const expect = chai.expect;
chai.use(sinonChai);

suite('Save File', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let showWarningMessageStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let workspaceStateGetStub: sinon.SinonStub;
  let workspaceStateUpdateStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;

  const sampleYaml = `
        # pipeline.yaml
        apiVersion: tekton.dev/v1beta1
        kind: Pipeline
        metadata:
            name: sample-pipeline-cluster-task-4
        spec:
            tasks:
            - name: cluster-task-pipeline-4
                taskRef:
                name: cluster-task-pipeline-4
                kind: ClusterTask
    `;

  const textDocument: vscode.TextDocument = {
    uri: {
      authority: '',
      fragment: '',
      fsPath: 'path',
      scheme: '',
      path: '',
      query: '',
      with: sandbox.stub(),
      toJSON: sandbox.stub()
    },
    fileName: 'pipeline.yaml',
    isClosed: false,
    isDirty: false,
    isUntitled: false,
    languageId: '',
    version: 1,
    eol: vscode.EndOfLine.CRLF,
    save: undefined,
    lineCount: 33,
    lineAt: undefined,
    getText: sinon.stub().returns(sampleYaml),
    getWordRangeAtPosition: undefined,
    offsetAt: undefined,
    positionAt: undefined,
    validatePosition: undefined,
    validateRange: undefined
  };


  setup(() => {
    showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
    workspaceStateGetStub = sandbox.stub(contextGlobalState.workspaceState, 'get').resolves();
    workspaceStateUpdateStub = sandbox.stub(contextGlobalState.workspaceState, 'update').resolves();
    execStub = sandbox.stub(cli, 'execute').resolves();
    sandbox.stub(pipelineExplorer, 'refresh').resolves();
    sandbox.stub(tektonYaml, 'isTektonYaml').resolves('ClusterTask');
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Save command', () => {

    test('calls the appropriate kubectl command to deploy on cluster', async () => {
      execStub.resolves({
        error: undefined,
        stderr: '',
        stdout: 'successfully created'
      });
      workspaceStateGetStub.onFirstCall().returns(undefined);
      showWarningMessageStub.onFirstCall().resolves('Save Once');
      await save(textDocument);
      expect(execStub).calledOnceWith(Command.create('path'));
      showInformationMessageStub.calledOnce;
      showWarningMessageStub.calledOnce;
      workspaceStateGetStub.calledOnce;
    });

    test('get save data from workspaceState', async () => {
      execStub.resolves({
        error: undefined,
        stderr: '',
        stdout: 'successfully created'
      });
      workspaceStateGetStub.onFirstCall().returns('path');
      await save(textDocument);
      expect(execStub).calledOnceWith(Command.create('path'));
      showInformationMessageStub.calledOnce;
      showWarningMessageStub.calledOnce;
      workspaceStateGetStub.calledOnce;
    });

    test('Update the yaml if fail to create resources', async () => {
      execStub.onFirstCall().resolves({
        error: 'error',
        stderr: 'error',
        stdout: ''
      });
      execStub.onSecondCall().resolves({
        error: '',
        stderr: '',
        stdout: 'successfully updated/created'
      });
      workspaceStateGetStub.onFirstCall().returns('path');
      await save(textDocument);
      showErrorMessageStub.calledOnce;
      workspaceStateGetStub.calledOnce;
      showInformationMessageStub.calledOnce;
    });

    test('Throw error when apply command fails', async () => {
      execStub.onFirstCall().resolves({
        error: 'error',
        stderr: 'error',
        stdout: ''
      });
      execStub.onSecondCall().resolves({
        error: 'error',
        stderr: 'error',
        stdout: ''
      });
      workspaceStateGetStub.onFirstCall().returns('path');
      await save(textDocument);
      showErrorMessageStub.calledTwice;
      workspaceStateGetStub.calledOnce;
    });
    
    test('update the path to workspaceState', async () => {
      execStub.resolves({
        error: undefined,
        stderr: '',
        stdout: 'successfully created'
      });
      workspaceStateGetStub.onFirstCall().returns(undefined);
      showWarningMessageStub.onFirstCall().resolves('Save');
      workspaceStateUpdateStub.onFirstCall().resolves('path');
      await save(textDocument);
      expect(execStub).calledOnceWith(Command.create('path'));
      showInformationMessageStub.calledOnce;
      showWarningMessageStub.calledOnce;
      workspaceStateGetStub.calledOnce;
      workspaceStateUpdateStub.calledOnce;
    });

  });
});
