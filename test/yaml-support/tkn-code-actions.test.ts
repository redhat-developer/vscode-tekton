/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import { codeActionProvider } from '../../src/yaml-support/tkn-code-actions';
import { TektonYamlType } from '../../src/yaml-support/tkn-yaml';
import { TestTextDocument } from '../text-document-mock';
import { tektonVfsProvider } from '../../src/util/tekton-vfs';

const expect = chai.expect;
chai.use(sinonChai);


suite('Tekton CodeActions', () => {
  const sandbox = sinon.createSandbox();


  setup(() => {
    // some 
  });

  teardown(() => {
    sandbox.restore();
  });

  test('CodeAction for Pipeline should exist', () => {
    expect(codeActionProvider.isSupports(TektonYamlType.Pipeline)).to.be.true;
    expect(codeActionProvider.getProvider(TektonYamlType.Pipeline)).to.not.be.undefined;
  });

  suite('Inline Task', () => {
    let loadTektonDocumentStub: sinon.SinonStub;
    setup(() => {
      loadTektonDocumentStub = sandbox.stub(tektonVfsProvider, 'loadTektonDocument');
    });

    test('Provider should provide Inline Code Action', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'conditional-pipeline.yaml'), 'utf8');
      const doc = new TestTextDocument(vscode.Uri.parse('/home/some/conditional-pipeline.yaml'), yaml);

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 17, 24, 17), undefined, undefined) as vscode.CodeAction[];
      expect(result).is.not.empty;
      const inlineAction = result.find(it => it.title.startsWith('Inline'));
      expect(inlineAction.title).to.be.equal('Inline \'echo-hello\' Task spec');
    });

    test('Provider should resolve Inline CodeAction', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'conditional-pipeline.yaml'), 'utf8');
      const fileUri = vscode.Uri.parse('/home/some/conditional-pipeline2.yaml');
      const doc = new TestTextDocument(fileUri, yaml);
      const taskYaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'echo-hello-task.yaml'), 'utf8');
      loadTektonDocumentStub.resolves({getText: ()=> taskYaml} );

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 17, 24, 17), undefined, undefined) as vscode.CodeAction[];
      const inlineAction = result.find(it => it.title.startsWith('Inline'));
      const resultAction = await codeActionProvider.getProvider(TektonYamlType.Pipeline).resolveCodeAction(inlineAction, undefined);
      const edit = resultAction.edit;
      expect(edit.has(fileUri)).is.true;
      expect(edit.get(fileUri)).has.length(1);
      expect(edit.get(fileUri)[0]).to.deep.equal(vscode.TextEdit.replace(new vscode.Range(29, 6, 30, 25), 'taskSpec:\n        metadata:\n          annotations: {}\n        steps:\n          - image: ubuntu\n            name: echo\n            resources: {}\n            script: echo hello\n                         '))
    });
  });

  suite('Extract Task Action', () => {

    let saveTektonDocumentStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let showQuickPickStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub; 

    setup(() => {
      saveTektonDocumentStub = sandbox.stub(tektonVfsProvider, 'saveTektonDocument');
      showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
      showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
      executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
    });

    test('Provider should provide Extract Task Action', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'extract-task-pipeline.yaml'), 'utf8');
      const doc = new TestTextDocument(vscode.Uri.parse('/home/someextract-task-pipeline.yaml'), yaml);

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 18, 24, 18), undefined, undefined) as vscode.CodeAction[];
      expect(result).is.not.empty;
      const inlineAction = result.find(it => it.title.startsWith('Extract'));
      expect(inlineAction.title).to.be.equal('Extract \'print-motd\' Task spec');
    });

    test('Provider should resolve Extract Task CodeAction', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'extract-task-pipeline.yaml'), 'utf8');
      const fileUri = vscode.Uri.parse('/home/someextract-task-pipeline.yaml');
      const doc = new TestTextDocument(fileUri, yaml);

      saveTektonDocumentStub.resolves();
      showInputBoxStub.resolves('foo-name');
      showQuickPickStub.resolves('Task');
      executeCommandStub.resolves();

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 17, 24, 17), undefined, undefined) as vscode.CodeAction[];
      const inlineAction = result.find(it => it.title.startsWith('Extract'));
      const resultAction = await codeActionProvider.getProvider(TektonYamlType.Pipeline).resolveCodeAction(inlineAction, undefined);
      const edit = resultAction.edit;
      expect(edit.has(fileUri)).is.true;
      expect(edit.get(fileUri)).has.length(1);
      expect(edit.get(fileUri)[0]).to.deep.equal(vscode.TextEdit.replace(new vscode.Range(20, 6, 40, 18), 'taskRef:\n        name: foo-name\n        kind: Task'))
    });

    test('Extract Task CodeAction should create proper task', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'extract-task-pipeline.yaml'), 'utf8');
      const fileUri = vscode.Uri.parse('/home/someextract-task-pipeline.yaml');
      const doc = new TestTextDocument(fileUri, yaml);

      saveTektonDocumentStub.resolves();
      showInputBoxStub.resolves('foo-name');
      showQuickPickStub.resolves('Task');

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 17, 24, 17), undefined, undefined) as vscode.CodeAction[];
      const inlineAction = result.find(it => it.title.startsWith('Extract'));
      const resultAction = await codeActionProvider.getProvider(TektonYamlType.Pipeline).resolveCodeAction(inlineAction, undefined);
      const edit = resultAction.edit;
      expect(edit.has(fileUri)).is.true;
      expect(edit.get(fileUri)).has.length(1);
      expect(saveTektonDocumentStub).calledOnce;
      const taskDoc = saveTektonDocumentStub.getCall(0).args[0];
      expect(taskDoc.getText()).to.be.equal(`apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: foo-name
  annotations:
    manifestival: new
    tekton.dev/pipelines.minVersion: 0.12.1
    tekton.dev/tags: cli
  labels:
    app.kubernetes.io/version: '0.1'
    operator.tekton.dev/provider-type: redhat
spec:
  workspaces:
    - name: message-of-the-day
      optional: true
  steps:
    - image: alpine
      script: |
        #!/usr/bin/env ash
        for f in "$(workspaces.message-of-the-day.path)"/* ; do
          echo "Message from $f:"
          cat "$f"
          echo "" # add newline
        done
`)
    });
  });
});
