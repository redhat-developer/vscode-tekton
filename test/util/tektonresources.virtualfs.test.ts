/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os'
import * as fs from 'fs';
import * as path from 'path';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TektonResourceVirtualFileSystemProvider, kubefsUri } from '../../src/util/tektonresources.virtualfs';
import { Uri, workspace, window, commands, TextDocument, EndOfLine } from 'vscode';
import { CliImpl } from '../../src/cli';
import * as k8s from 'vscode-kubernetes-tools-api';

const expect = chai.expect;
chai.use(sinonChai);

suite('TektonResourceVirtualFileSystemProvider', () => {
    let sandbox: sinon.SinonSandbox;
    let v1Stub: sinon.SinonStub;
    let osStub: sinon.SinonStub;
    let unlinkSyncStub: sinon.SinonStub<[fs.PathLike], void>;
    let openTextStub: sinon.SinonStub<[{ language?: string; content?: string }?], Thenable<import('vscode').TextDocument>>;
    let executeCommandStub: sinon.SinonStub<[string, ...any[]], Thenable<unknown>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let workspaceFoldersStub: sinon.SinonStub<any[], any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let writeFileSyncStub: sinon.SinonStub<[string | number | Buffer | import('url').URL, any, fs.WriteFileOptions?], void>;
    let trvfsp: TektonResourceVirtualFileSystemProvider;
    let execStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub<[string, import('vscode').MessageOptions, ...import('vscode').MessageItem[]], Thenable<import('vscode').MessageItem>>;
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
        execStub = sandbox.stub(CliImpl.getInstance(), 'execute').resolves({ error: undefined, stdout: getYaml });
        trvfsp = new TektonResourceVirtualFileSystemProvider();
        workspaceFoldersStub = sandbox.stub(workspace, 'workspaceFolders').value([wsFolder1]);
        writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
        showErrorMessageStub = sandbox.stub(window, 'showErrorMessage');
        const api: k8s.API<k8s.KubectlV1> = {
            available: false,
            reason: 'extension-not-available'
        };
        v1Stub = sandbox.stub(k8s.extension.kubectl, 'v1').value(api);
        osStub = sandbox.stub(os, 'tmpdir');
        unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
        openTextStub = sandbox.stub(workspace, 'openTextDocument').resolves(textDocument);
        sandbox.stub(window, 'showTextDocument');
        executeCommandStub = sandbox.stub(commands, 'executeCommand');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should able to read file', async () => {
        const result = await trvfsp.readFile(Uri.parse(tknUri));
        expect(result.toString()).deep.equals(getYaml);
        expect(execStub).calledOnce;
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
        execStub.onFirstCall().resolves({ error: 'error', stdout: undefined });
        try {
            await trvfsp.readFile(Uri.parse(tknUri));
        } catch (err) {
            expect(err).deep.equals('error');
            expect(execStub).calledOnce;
        }
    });

    test('should able to apply and save yaml data', async () => {
        const content = await trvfsp.readFile(Uri.parse(tknUri));
        if (process.platform === 'win32') {
            osStub.onFirstCall().resolves('c:\\temp');
        } else {
            osStub.onFirstCall().resolves('/temp');
        }
        const api: k8s.API<k8s.KubectlV1> = {
            available: true,
            api: {
                invokeCommand: sandbox.stub().resolves({ stdout: getYaml, stderr: '', code: 0}),
                portForward: sandbox.stub()
            }
        };
        v1Stub.onFirstCall().value(api);
        await trvfsp.writeFile(Uri.parse(tknUri), content);
        writeFileSyncStub.calledOnce;
        executeCommandStub.calledOnce;
        openTextStub.calledOnce;
        unlinkSyncStub.calledOnce;
    });

    test('return undefined if temp folder is not found', async () => {
        const content = await trvfsp.readFile(Uri.parse(tknUri));
        if (process.platform === 'win32') {
            osStub.onFirstCall().resolves(undefined);
        } else {
            osStub.onFirstCall().resolves(undefined);
        }
        const result = await trvfsp.writeFile(Uri.parse(tknUri), content);
        expect(result).equals(undefined);
    });

    test('throw error if command fails to update yaml file', async () => {
        execStub.onSecondCall().resolves({ error: 'error', stdout: undefined });
        try {
            const content = await trvfsp.readFile(Uri.parse(tknUri));
            if (process.platform === 'win32') {
                osStub.onFirstCall().resolves('c:\\temp');
            } else {
                osStub.onFirstCall().resolves('/temp');
            }
            await trvfsp.writeFile(Uri.parse(tknUri), content);
        } catch (err) {
            expect(err.message).equals('error');
            expect(execStub).calledTwice;
        }
    });

    test('throw error if kubectl command fails to update yaml file', async () => {
        try {
            const content = await trvfsp.readFile(Uri.parse(tknUri));
            if (process.platform === 'win32') {
                osStub.onFirstCall().resolves('c:\\temp');
            } else {
                osStub.onFirstCall().resolves('/temp');
            }
            const api: k8s.API<k8s.KubectlV1> = {
                available: true,
                api: {
                    invokeCommand: sandbox.stub().resolves({ stdout: '', stderr: 'error', code: 0}),
                    portForward: sandbox.stub()
                }
            };
            v1Stub.onSecondCall().value(api);
            await trvfsp.writeFile(Uri.parse(tknUri), content);
        } catch (err) {
            expect(err.message).equals('error');
        }
    });

    test('create file system uri parse', async () => {
        workspaceFoldersStub.onFirstCall().resolves(wsFolder1);
        const content = kubefsUri('pipeline/petclinic-deploy-pipeline', 'yaml');
        const nonce = new Date().getTime();
        expect(content).deep.equals(Uri.parse(`tkn://loadtektonresource/pipeline-petclinic-deploy-pipeline.yaml?value=pipeline/petclinic-deploy-pipeline&_=${nonce}`));
    });
});