/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { tektonYaml, pipelineYaml, DeclaredTask, pipelineRunYaml } from '../../src/yaml-support/tkn-yaml';
import * as graph from '../../src/pipeline/pipeline-graph';
import { VirtualDocument } from '../../src/yaml-support/yaml-locator';
import { PipelineRunData } from '../../src/tekton';
import { tektonFSUri, tektonVfsProvider } from '../../src/util/tekton-vfs';

const expect = chai.expect;
chai.use(sinonChai);


suite('Tekton graph', () => {
  const sandbox = sinon.createSandbox();
  let tknDocuments: sinon.SinonStub;
  let metadataName: sinon.SinonStub;
  let showQuickPick: sinon.SinonStub;
  let getPipelineTasks: sinon.SinonStub;

  setup(() => {
    tknDocuments = sandbox.stub(tektonYaml, 'getTektonDocuments');
    metadataName = sandbox.stub(tektonYaml, 'getMetadataName');
    getPipelineTasks = sandbox.stub(pipelineYaml, 'getPipelineTasks');
    showQuickPick = sandbox.stub(vscode.window, 'showQuickPick');
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Pipeline graph', () => {
    test('Should return empty array if no pipeline yaml', async () => {
      tknDocuments.returns(undefined);
      const result = await graph.calculatePipelineGraph({} as vscode.TextDocument);
      expect(result).eql([]);
    });

    test('Should ask to select pipeline if more then one detected', async () => {
      tknDocuments.returns([{}, {}]);
      metadataName.onFirstCall().returns('Foo');
      metadataName.onSecondCall().returns('Bar');
      showQuickPick.resolves('Foo');
      getPipelineTasks.returns([]);
      await graph.calculatePipelineGraph({} as vscode.TextDocument);

      expect(showQuickPick.calledOnceWith(['Foo', 'Bar'], { placeHolder: 'Your file contains more then one Pipeline, please select one', ignoreFocusOut: true }));
      expect(getPipelineTasks.calledOnce).true;
    });

    test('Should convert tasks to node and edge', async () => {
      tknDocuments.returns([{}]);
      getPipelineTasks.returns([{id: 'Foo', name: 'Foo', kind: 'Task', taskRef: 'FooTask', runAfter: [] } as DeclaredTask,
      {id: 'Bar', name: 'Bar', kind: 'Task', taskRef: 'BarTask', runAfter: ['Foo'] } as DeclaredTask]);
      const result = await graph.calculatePipelineGraph({} as vscode.TextDocument);
      expect(result.length).equal(3);
    });
  });

  suite('PipelineRun graph', () => {
    let getTektonPipelineRefOrSpec: sinon.SinonStub;
    let loadTektonDocument: sinon.SinonStub;

    setup(() => {
      getTektonPipelineRefOrSpec = sandbox.stub(pipelineRunYaml, 'getTektonPipelineRefOrSpec');
      loadTektonDocument = sandbox.stub(tektonVfsProvider, 'loadTektonDocument');
      sandbox.useFakeTimers({
        now: new Date(),
        shouldAdvanceTime: true,
        toFake: ['Date']
      });
    });

    test('should ask to chose pipeline run', async () => {
      getTektonPipelineRefOrSpec.returns([]);
      metadataName.returns('Foo').returns('Bar');
      loadTektonDocument.resolves(
        {
          getText: () => '{foo: "json"}'
        } as VirtualDocument);

      tknDocuments.returns([{ nodes: [{}] }, { nodes: [{}, {}] }]);
      showQuickPick.resolves('Foo');

      const document = {
        uri: vscode.Uri.parse('file://some/pipelinerun.yaml')
      } as vscode.TextDocument
      await graph.calculatePipelineRunGraph(document);

      expect(showQuickPick).calledOnce;
    });

    test('should load pipeline definition', async () => {
      getTektonPipelineRefOrSpec.returns('FooPipeline');
      metadataName.returns('Foo');
      loadTektonDocument.onFirstCall().resolves(
        {
          getText: () => 'Some: yaml'
        } as VirtualDocument);

      loadTektonDocument.onSecondCall().resolves(
        {
          getText: () => '{}'
        } as VirtualDocument);

      tknDocuments.returns([{ nodes: [{}] }]);
      getPipelineTasks.returns([]);

      const document = {
        uri: vscode.Uri.parse('file://some/pipelinerun.yaml'),

      } as vscode.TextDocument
      await graph.calculatePipelineRunGraph(document);
      expect(loadTektonDocument).calledWith(tektonFSUri('pipeline', 'FooPipeline', 'yaml'));
    });

    test('uses provided pipeline run', async () => {
      getTektonPipelineRefOrSpec.returns('FooPipeline');
      metadataName.returns('Foo');
      loadTektonDocument.onFirstCall().resolves({
        getText: () => 'Some: yaml'
      } as VirtualDocument);

      tknDocuments.returns([{ nodes: [{}] }]);
      getPipelineTasks.returns([]);

      const document = {
        uri: vscode.Uri.parse('file://some/pipelinerun.yaml'),

      } as vscode.TextDocument
      const result = await graph.calculatePipelineRunGraph(document, {} as PipelineRunData);

      expect(result).eql([]);
    });
  });


});
