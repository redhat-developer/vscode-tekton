/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as tknYaml from '../../src/yaml-support/tkn-yaml';
import { calculatePipelineGraph } from '../../src/pipeline/pipeline-graph';

const expect = chai.expect;
chai.use(sinonChai);


suite('pipeline graph', () => {
  const sandbox = sinon.createSandbox();
  let tknDocuments: sinon.SinonStub;
  let metadataName: sinon.SinonStub;
  let showQuickPick: sinon.SinonStub;
  let getPipelineTasks: sinon.SinonStub;

  setup(() => {
    tknDocuments = sandbox.stub(tknYaml, 'getTektonDocuments');
    metadataName = sandbox.stub(tknYaml, 'getMetadataName');
    getPipelineTasks = sandbox.stub(tknYaml, 'getPipelineTasks');
    showQuickPick = sandbox.stub(vscode.window, 'showQuickPick');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Should return empty array if no pipeline yaml', async () => {
    tknDocuments.returns(undefined);
    const result = await calculatePipelineGraph({} as vscode.TextDocument);
    expect(result).eql([]);
  });

  test('Should ask to select pipeline if more then one detected', async () => {
    tknDocuments.returns([{}, {}]);
    metadataName.onFirstCall().returns('Foo');
    metadataName.onSecondCall().returns('Bar');
    showQuickPick.resolves('Foo');
    getPipelineTasks.returns([]);
    await calculatePipelineGraph({} as vscode.TextDocument);

    expect(showQuickPick.calledOnceWith(['Foo', 'Bar'], { placeHolder: 'Your file contains more then one Pipeline, please select one', ignoreFocusOut: true }));
    expect(getPipelineTasks.calledOnce).true;
  });

  test('Should convert tasks to node and edge', async () => {
    tknDocuments.returns([{}]);
    getPipelineTasks.returns([{ name: 'Foo', kind: 'Task', taskRef: 'FooTask', runAfter: [] } as tknYaml.DeclaredTask,
    { name: 'Bar', kind: 'Task', taskRef: 'BarTask', runAfter: ['Foo'] } as tknYaml.DeclaredTask]);
    const result = await calculatePipelineGraph({} as vscode.TextDocument);
    expect(result.length).equal(3);
  });
});
