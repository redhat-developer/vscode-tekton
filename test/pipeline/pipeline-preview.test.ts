/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { tektonYaml } from '../../src/yaml-support/tkn-yaml';
import * as preview from '../../src/pipeline/preview-manager';
import { showPipelinePreview } from '../../src/pipeline/pipeline-preview';
import { TektonYamlType } from '../../src/yaml-support/tkn-yaml';
import { calculatePipelineGraph } from '../../src/pipeline/pipeline-graph';

const expect = chai.expect;
chai.use(sinonChai);

suite('pipeline preview', () => {
  const sandbox = sinon.createSandbox();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeEditor: any;
  let tknDocuments: sinon.SinonStub;
  let previewManager: sinon.SinonStub;

  setup(() => {
    activeEditor = {} as vscode.TextEditor;
    sandbox.stub(vscode.window, 'activeTextEditor').value(activeEditor);
    tknDocuments = sandbox.stub(tektonYaml, 'getTektonDocuments');
    previewManager = sandbox.stub(preview.previewManager, 'showPipelinePreview');
  });

  teardown(() => {
    sandbox.restore();
  });


  test('showPipelinePreview() should check yaml documents', () => {
    const doc = sandbox.mock();
    activeEditor.document = doc;
    showPipelinePreview();
    expect(tknDocuments.calledTwice).true
    expect(tknDocuments.calledWith(doc, TektonYamlType.Pipeline)).true;
  });

  test('showPipelinePreview() should calls "previewManager.showPipelinePreview"', () => {
    const doc = sandbox.mock();
    activeEditor.document = doc;
    tknDocuments.returns([{}]);

    showPipelinePreview();
    expect(previewManager.calledOnceWith(doc, { resourceColumn: vscode.ViewColumn.One, previewColumn: vscode.ViewColumn.One + 1, graphProvider: calculatePipelineGraph })).true;
  });

});
