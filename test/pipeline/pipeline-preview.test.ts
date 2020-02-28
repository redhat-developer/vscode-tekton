/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as tknYaml from '../../src/yaml-support/tkn-yaml';
import * as preview from '../../src/pipeline/preview-manager';
import { showPipelinePreview } from '../../src/pipeline/pipeline-preview';
import { TektonYamlType } from '../../src/yaml-support/tkn-yaml';

const expect = chai.expect;
chai.use(sinonChai);
suite('pipeline preview', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeEditor: any;
  let tknDocuments: sinon.SinonStub;
  let previewManager: sinon.SinonStub;
  setup(() => {
    sandbox = sinon.createSandbox();
    activeEditor = {} as vscode.TextEditor;
    sandbox.stub(vscode.window, 'activeTextEditor').value(activeEditor);
    tknDocuments = sandbox.stub(tknYaml, 'getTektonDocuments');
    previewManager = sandbox.stub(preview.PreviewManager.prototype, 'showPreview');
  });

  teardown(() => {
    sandbox.restore();
  });


  test('showPipelinePreview() should check yaml documents', () => {
    const doc = sandbox.mock();
    activeEditor.document = doc;
    showPipelinePreview();
    expect(tknDocuments.calledOnce).true
    expect(tknDocuments.calledWith(doc, TektonYamlType.Pipeline)).true;
  });
  test('showPipelinePreview() should calls "showPreview"', () => {
    const doc = sandbox.mock();
    activeEditor.document = doc;
    tknDocuments.returns([{}]);

    showPipelinePreview();
    expect(previewManager.calledOnceWith(doc, { resourceColumn: vscode.ViewColumn.One, previewColumn: vscode.ViewColumn.One + 1 })).true;
  });

});
