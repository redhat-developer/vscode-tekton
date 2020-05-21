/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { cli } from '../../src/cli';
import * as sinonChai from 'sinon-chai';
import { Command } from '../../src/tkn';
import { save } from '../../src/tekton/save';
import { contextGlobalState } from '../../src/extension';
import { tektonYaml } from '../../src/yaml-support/tkn-yaml';
import { pipelineExplorer } from '../../src/pipeline/pipelineExplorer';

const expect = chai.expect;
chai.use(sinonChai);

suite('Save File', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;
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
      fsPath: 'workspace.yaml',
      scheme: '',
      path: '',
      query: '',
      with: sandbox.stub(),
      toJSON: sandbox.stub()
    },
    fileName: 'workspace.yaml',
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
    sandbox.stub(vscode.workspace, 'getConfiguration').returns({
      get<T>(): Promise<T|undefined> {
        return Promise.resolve(undefined);
      },
      update(): Promise<void> {
        return Promise.resolve();
      },
      inspect(): {
          key: string;
          } {
        return undefined;
      },
      has(): boolean {
        return true;
      },
      save: true
    });
    osStub = sandbox.stub(os, 'tmpdir').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    readFileStub = sandbox.stub(fs, 'readFile').resolves(`
    apiVersion: tekton.dev/v1beta1
    kind: Task
    metadata:
      name: print-data
    spec:
      workspaces:
      - name: storage
        readOnly: true
      params:
      - name: filename
      steps:
      - name: print-secrets
        image: ubuntu
        script: cat $(workspaces.storage.path)/$(params.filename)
    `);
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
      expect(execStub).calledOnceWith(Command.create('workspace.yaml'));
      unlinkStub.calledOnce;
      osStub.calledOnce;
      readFileStub.calledOnce;
      writeFileStub.calledOnce;
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
      expect(execStub).calledOnceWith(Command.create('workspace.yaml'));
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
        stdout: 'successfully Deploy'
      });
      osStub.returns('path');
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
      osStub.returns('path');
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
      expect(execStub).calledOnceWith(Command.create('workspace.yaml'));
      showInformationMessageStub.calledOnce;
      showWarningMessageStub.calledOnce;
      workspaceStateGetStub.calledOnce;
      workspaceStateUpdateStub.calledOnce;
    });

  });
});
