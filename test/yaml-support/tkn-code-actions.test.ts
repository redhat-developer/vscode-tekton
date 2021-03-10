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

  suite('Inline Task', () => {
    let loadTektonDocumentStub: sinon.SinonStub;
    setup(() => {
      loadTektonDocumentStub = sandbox.stub(tektonVfsProvider, 'loadTektonDocument');
    });
    test('CodeAction for Pipeline should exist', () => {
      expect(codeActionProvider.isSupports(TektonYamlType.Pipeline)).to.be.true;
      expect(codeActionProvider.getProvider(TektonYamlType.Pipeline)).to.not.be.undefined;
    });

    test('Provider should provide Inline Code Action', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', 'test', 'yaml-support', 'conditional-pipeline.yaml'), 'utf8');
      const doc = new TestTextDocument(vscode.Uri.parse('/home/some/conditional-pipeline.yaml'), yaml);

      const result = codeActionProvider.getProvider(TektonYamlType.Pipeline).provideCodeActions(doc, new vscode.Range(24, 17, 24, 17), undefined, undefined) as vscode.CodeAction[];
      expect(result).is.not.empty;
      const inlineAction = result.find(it => it.title.startsWith('Inline'));
      expect(inlineAction.title).to.be.equal('Inline \'echo-hello\'');
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
});
