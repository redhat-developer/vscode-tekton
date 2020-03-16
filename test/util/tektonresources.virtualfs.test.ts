/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os'
import * as fs from 'fs-extra';
import * as path from 'path';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TektonResourceVirtualFileSystemProvider, kubefsUri } from '../../src/util/tektonresources.virtualfs';
import { Uri, workspace, window, commands, TextDocument, EndOfLine } from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

const expect = chai.expect;
chai.use(sinonChai);

suite('TektonResourceVirtualFileSystemProvider', () => {
  let sandbox: sinon.SinonSandbox;
  let v1Stub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let openTextStub: sinon.SinonStub;
  let executeCommandStub: sinon.SinonStub;
  let workspaceFoldersStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let trvfsp: TektonResourceVirtualFileSystemProvider;
  let nonce: sinon.SinonFakeTimers;
  const tknUri = 'tknsss://loadtektonresourceload/pipeline-petclinic-deploy-pipeline.yaml?value%3Dpipeline%2Fpetclinic-deploy-pipeline%26_%3D1581402784093';
  const getYaml = `apiVersion: tekton.dev/v1alpha1
    kind: Pipeline
    metadata:
      creationTimestamp: "2020-01-30T08:46:16Z"
      generation: 1
      name: petclinic-deploy-pipeline
      namespace: pipelines-tutorial
      resourceVersion: "83631"
      selfLink: /apis/tekton.dev/v1alpha1/namespaces/pipelines-tutorial/pipelines/petclinic-deploy-pipeline
      uid: fa44e0c0-433c-11ea-a5d4-0ef0e3c74fbe
    spec:
      resources:
      - name: app-git
        type: git
      - name: app-image
        type: image
      tasks:
      - name: build
        params:
        - name: TLSVERIFY
          value: "false"
        resources:
          inputs:
          - name: source
            resource: app-git
          outputs:
          - name: image
            resource: app-image
        taskRef:
          name: s2i-java-8
      - name: deploy
        params:
        - name: ARGS
          value:
          - rollout
          - latest
          - spring-petclinic
        runAfter:
        - build
        taskRef:
          name: openshift-client
    `;
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
  const fixtureFolder = path.join(__dirname, '..', '..', 'test', 'fixtures').normalize();
  const folderUri = Uri.file(path.join(fixtureFolder));
  const wsFolder1 = { uri: folderUri, index: 0, name: 'folder' };

  setup(() => {
    sandbox = sinon.createSandbox();
    trvfsp = new TektonResourceVirtualFileSystemProvider();
    workspaceFoldersStub = sandbox.stub(workspace, 'workspaceFolders').value([wsFolder1]);
    writeFileStub = sandbox.stub(fs, 'writeFile');
    sandbox.stub(window, 'showErrorMessage');
    const api: k8s.API<k8s.KubectlV1> = {
      available: false,
      reason: 'extension-not-available'
    };
    v1Stub = sandbox.stub(k8s.extension.kubectl, 'v1').value(api);
    osStub = sandbox.stub(os, 'tmpdir');
    unlinkStub = sandbox.stub(fs, 'unlink');
    openTextStub = sandbox.stub(workspace, 'openTextDocument').resolves(textDocument);
    executeCommandStub = sandbox.stub(commands, 'executeCommand');
    nonce = sandbox.useFakeTimers({
      now: new Date(),
      shouldAdvanceTime: true,
      toFake: ['Date']
    });
  });

  teardown(() => {
    sandbox.restore();
  });

  test('should return error if kubectl is not available', async () => {
    let isErr = false;
    try {
      await trvfsp.readFile(Uri.parse(tknUri));
    } catch (err) {
      expect(err).is.not.undefined;
      isErr = true
    }
    
    expect(isErr).true;
  });

  test('should able to get yaml data from kubectl', async () => {
    const api: k8s.API<k8s.KubectlV1> = {
      available: true,
      api: {
        invokeCommand: sandbox.stub().resolves({ stdout: getYaml, stderr: '', code: 0}),
        portForward: sandbox.stub()
      }
    };
    v1Stub.onFirstCall().value(api);
    const result = await trvfsp.readFile(Uri.parse(tknUri));
    expect(result.toString()).deep.equals(getYaml);
  });

  test('throw error if command fails', async () => {
    try {
      await trvfsp.readFile(Uri.parse(tknUri));
    } catch (err) {
      expect(err.message).equals('kubectl is not available, check k8\'s documentation to install "kubectl"');
    }
  });

  test('should able to apply and save yaml data', async () => {
    if (process.platform === 'win32') {
      osStub.onFirstCall().returns('c:\\temp');
    } else {
      osStub.onFirstCall().returns('/temp');
    }
    const api: k8s.API<k8s.KubectlV1> = {
      available: true,
      api: {
        invokeCommand: sandbox.stub().resolves({ stdout: getYaml, stderr: '', code: 0}),
        portForward: sandbox.stub()
      }
    };
    v1Stub.value(api);
    const content = await trvfsp.readFile(Uri.parse(tknUri));
    await trvfsp.writeFile(Uri.parse(tknUri), content);
    writeFileStub.calledOnce;
    executeCommandStub.calledOnce;
    openTextStub.calledOnce;
    unlinkStub.calledOnce;
  });

  test('return undefined if temp folder is not found', async () => {
    const api: k8s.API<k8s.KubectlV1> = {
      available: true,
      api: {
        invokeCommand: sandbox.stub().resolves({ stdout: getYaml, stderr: '', code: 0}),
        portForward: sandbox.stub()
      }
    };
    v1Stub.value(api);
    const content = await trvfsp.readFile(Uri.parse(tknUri));
    if (process.platform === 'win32') {
      osStub.onFirstCall().returns(undefined);
    } else {
      osStub.onFirstCall().returns(undefined);
    }
    const result = await trvfsp.writeFile(Uri.parse(tknUri), content);
    expect(result).equals(undefined);
  });

  test('throw error if command fails to update yaml file', async () => {
    try {
      const api: k8s.API<k8s.KubectlV1> = {
        available: true,
        api: {
          invokeCommand: sandbox.stub().resolves({ stdout: getYaml, stderr: '', code: 0}),
          portForward: sandbox.stub()
        }
      };
      v1Stub.value(api);
      const content = await trvfsp.readFile(Uri.parse(tknUri));
      if (process.platform === 'win32') {
        osStub.onFirstCall().returns('c:\\temp');
      } else {
        osStub.onFirstCall().returns('/temp');
      }
      await trvfsp.writeFile(Uri.parse(tknUri), content);
    } catch (err) {
      expect(err.message).equals('error');
    }
  });

  test('throw error if kubectl command fails to update yaml file', async () => {
    try {
      const api: k8s.API<k8s.KubectlV1> = {
        available: true,
        api: {
          invokeCommand: sandbox.stub().resolves({ stdout: '', stderr: 'error', code: 0}),
          portForward: sandbox.stub()
        }
      };
      v1Stub.onSecondCall().value(api);
      const content = await trvfsp.readFile(Uri.parse(tknUri));
      if (process.platform === 'win32') {
        osStub.onFirstCall().returns('c:\\temp');
      } else {
        osStub.onFirstCall().returns('/temp');
      }
      await trvfsp.writeFile(Uri.parse(tknUri), content);
    } catch (err) {
      expect(err).equals('error');
    }
  });

  test('create file system uri parse', async () => {
    workspaceFoldersStub.onFirstCall().resolves(wsFolder1);
    const content = kubefsUri('pipeline/petclinic-deploy-pipeline', 'yaml');
    expect(content).deep.equals(Uri.parse(`tekton://loadtektonresource/pipeline-petclinic-deploy-pipeline.yaml?value=pipeline/petclinic-deploy-pipeline&_=${nonce.Date().getTime()}`));
  });
});
