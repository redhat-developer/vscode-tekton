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
import { initializeTknEditing, TknDefinitionProvider } from '../../src/yaml-support/tkn-editing';
import { tektonYaml, TektonYamlType } from '../../src/yaml-support/tkn-yaml';
import { TestTextDocument } from '../text-document-mock';
import { kubefsUri } from '../../src/util/tektonresources.virtualfs';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Editing support', () => {
  const sandbox = sinon.createSandbox();
  let wsTextDocuments: sinon.SinonStub;
  let onDidOpenTextDocument: sinon.SinonStub;
  let registerDefinitionProvider: sinon.SinonStub;
  let isTektonYamlStub: sinon.SinonStub;

  const extensionContext = { subscriptions: [] } as vscode.ExtensionContext;

  setup(() => {
    wsTextDocuments = sandbox.stub(vscode.workspace, 'textDocuments').value([]);
    onDidOpenTextDocument = sandbox.stub(vscode.workspace, 'onDidOpenTextDocument');
    registerDefinitionProvider = sandbox.stub(vscode.languages, 'registerDefinitionProvider');
    isTektonYamlStub = sandbox.stub(tektonYaml, 'isTektonYaml');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('initializeTknEditing() should check opened files', () => {
    wsTextDocuments.value([{ languageId: 'yaml', getText: () => 'Foo', version: 1, uri: vscode.Uri.parse('file:///editing/pipeline/pipeline.yam') } as vscode.TextDocument]);
    initializeTknEditing(extensionContext);
    expect(isTektonYamlStub).calledOnce;
  });


  test('initializeTknEditing() should add handler for textDocument opened event', () => {
    initializeTknEditing(extensionContext);
    expect(onDidOpenTextDocument).calledOnce
  });

  test('initializeTknEditing() should register Definition provided for supported yaml', () => {
    wsTextDocuments.value([{ languageId: 'yaml', getText: () => 'Foo', version: 1, uri: vscode.Uri.parse('file:///editing/pipeline/pipeline.yam') } as vscode.TextDocument]);
    isTektonYamlStub.returns(TektonYamlType.Pipeline);
    initializeTknEditing(extensionContext);
    expect(registerDefinitionProvider).calledOnce;
  });

  suite('Go to Definition', () => {
    const defProvider = new TknDefinitionProvider();
    const mockDocument = { languageId: 'yaml', getText: () => 'Foo', version: 1, uri: vscode.Uri.parse('file:///editing/pipeline/pipeline.yam') } as vscode.TextDocument;

    setup(() => {
      sandbox.useFakeTimers({
        now: new Date(),
        shouldAdvanceTime: true,
        toFake: ['Date']
      });
    });

    test('Definition provider should check tekton yaml type', () => {
      isTektonYamlStub.returns(TektonYamlType.Pipeline);
      defProvider.provideDefinition(mockDocument, new vscode.Position(0, 0), {} as vscode.CancellationToken);
      expect(isTektonYamlStub).calledOnceWith(mockDocument);
    });

    test('go to task name from runAfter', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'pipeline-ordering.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(21, 24), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(doc.uri.toString());
      expect(location.range).eql(new vscode.Range(new vscode.Position(13, 10), new vscode.Position(13, 29)));
    });

    test('go to task name from inputs resource', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'pipeline-ordering.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(32, 22), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(doc.uri.toString());
      expect(location.range).eql(new vscode.Range(new vscode.Position(6, 10), new vscode.Position(6, 21)));
    });

    test('go to task name from input resource from', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'pipeline-ordering.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(80, 18), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(doc.uri.toString());
      expect(location.range).eql(new vscode.Range(new vscode.Position(20, 10), new vscode.Position(20, 28)));
    });

    test('go to task name from taskRef should return k8s uri to task resource', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'pipeline-ordering.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(15, 15), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(kubefsUri('task/unit-tests', 'yaml').toString());
    });

    test('go to task name from taskRef should return k8s uri to task resource', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'pipeline-ordering.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(15, 15), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(kubefsUri('task/unit-tests', 'yaml').toString());
    });

    test('go to task name from conditionRef should return k8s uri to conditions resource', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'conditional-pipeline.yaml'));
      const doc = new TestTextDocument(vscode.Uri.parse('file:///editing/pipeline/conditional-pipeline.yaml'), yaml.toString());
      isTektonYamlStub.returns(TektonYamlType.Pipeline);

      const location = defProvider.provideDefinition(doc, new vscode.Position(21, 30), {} as vscode.CancellationToken) as vscode.Location;

      expect(location).not.undefined;
      expect(location.uri.toString()).eqls(kubefsUri('conditions/file-exists', 'yaml').toString());
    });

  });

});
