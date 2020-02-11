/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TektonResourceVirtualFileSystemProvider, kubefsUri } from '../../src/util/tektonresources.virtualfs';
import { Uri, workspace, window } from 'vscode';
import { CliImpl } from '../../src/cli';

const expect = chai.expect;
chai.use(sinonChai);

suite('Platform Utility', () => {
    let sandbox: sinon.SinonSandbox;
    let workspaceFoldersStub: sinon.SinonStub<any[], any>;
    let writeFileSyncStub: sinon.SinonStub<[string | number | Buffer | import("url").URL, any, fs.WriteFileOptions?], void>;
    let trvfsp: TektonResourceVirtualFileSystemProvider;
    let execStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub<[string, import("vscode").MessageOptions, ...import("vscode").MessageItem[]], Thenable<import("vscode").MessageItem>>;
    const tknUri = "tknsss://loadtektonresourceload/pipeline-petclinic-deploy-pipeline.yaml?value%3Dpipeline%2Fpetclinic-deploy-pipeline%26_%3D1581402784093";
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
    const fixtureFolder = path.join(__dirname, '..', '..', 'test', 'fixtures').normalize();
    const folderUri = Uri.file(path.join(fixtureFolder));
    const wsFolder1 = { uri: folderUri, index: 0, name: 'folder' };

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(CliImpl.getInstance(), 'execute').resolves({ error: undefined, stdout: getYaml });
        trvfsp = new TektonResourceVirtualFileSystemProvider();
        workspaceFoldersStub = sandbox.stub(workspace, 'workspaceFolders').value([wsFolder1]);
        writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
        showErrorMessageStub = sandbox.stub(window, 'showErrorMessage');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should able to read file', async () => {
        const result = await trvfsp.readFile(Uri.parse(tknUri));
        expect(result.toString()).deep.equals(getYaml);
        expect(execStub).calledOnce;
    });

    test('throw error if command fails', async () => {
      execStub.onFirstCall().resolves({ error: 'error', stdout: undefined });
      try {
        await trvfsp.readFile(Uri.parse(tknUri));
      } catch (err) {
        expect(err).deep.equals('error');
        expect(execStub).calledOnce;
      }
    });

    test('should able to save file in workspace', async () => {
      const content = await trvfsp.readFile(Uri.parse(tknUri));
      await trvfsp.writeFile(Uri.parse(tknUri), content);
      writeFileSyncStub.calledOnce;
    });

    test('return undefined if workspace folder is not present', async () => {
      workspaceFoldersStub.onFirstCall().value(undefined);
      const content = await trvfsp.readFile(Uri.parse(tknUri));
      await trvfsp.writeFile(Uri.parse(tknUri), content);
      showErrorMessageStub.calledOnce;
    });

    test('create file system uri parse', async () => {
      workspaceFoldersStub.onFirstCall().resolves(wsFolder1);
      const content = kubefsUri('pipeline/petclinic-deploy-pipeline', 'yaml');
      expect(content).deep.equals(Uri.parse('tkn://loadtektonresource/pipeline-petclinic-deploy-pipeline.yaml?value=pipeline/petclinic-deploy-pipeline'));
    });
});