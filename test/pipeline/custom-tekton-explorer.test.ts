/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { CustomTektonExplorer } from '../../src/pipeline/customTektonExplorer';
import { pipelineExplorer } from '../../src/pipeline/pipelineExplorer';
import { TestItem } from '../tekton/testTektonitem';
import * as tkn from '../../src/tkn';
import { TektonNode } from '../../src/tkn';

const expect = chai.expect;
chai.use(sinonChai);

suite('Custom explorer test', () => {
  const sandbox = sinon.createSandbox();
  let createTreeViewStub: sinon.SinonStub;
  let pipelineExpStub: sinon.SinonStub;
  const pipelineNodeItem = new TestItem(tkn.TknImpl.ROOT, 'pipelinenode', tkn.ContextType.PIPELINENODE);
  const pipelineItem1 = new TestItem(pipelineNodeItem, 'pipeline1', tkn.ContextType.PIPELINE);
  const pipelinerunItem = new TestItem(pipelineItem1, 'pipelinerun1', tkn.ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  const taskrunItem = new TestItem(pipelinerunItem, 'taskrun1', tkn.ContextType.TASKRUN, undefined, '2019-07-25T12:03:01Z', 'True');

  setup(() => {
    createTreeViewStub = sandbox.stub(vscode.window, 'createTreeView');
    pipelineExpStub = sandbox.stub(pipelineExplorer, 'getSelection');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Should create tree view', () => {
    createTreeViewStub.returns({});
    new CustomTektonExplorer();
    expect(createTreeViewStub.calledOnce).true;
    expect(createTreeViewStub.args[0][0]).equal('tektonCustomTreeView');
  });

  test('filterParents should return list without parents', () => {

    pipelineExpStub.returns([pipelineNodeItem, pipelineItem1, pipelinerunItem, taskrunItem]);
    const explorer = new CustomTektonExplorer();
    sandbox.stub(explorer, 'refresh');

    explorer.showSelected(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemToShow: TektonNode[] = (explorer as any).itemsToShow;
    expect(itemToShow.length).equal(1);
    expect(itemToShow[0]).eql(taskrunItem);
  });

  test('removeItem should remove selected items', () => {

    pipelineExpStub.returns([pipelineNodeItem, pipelineItem1, pipelinerunItem, taskrunItem]);
    const treeView = {
      selection: [pipelineItem1]
    };
    createTreeViewStub.returns(treeView);
    const explorer = new CustomTektonExplorer();
    sandbox.stub(explorer, 'refresh');

    explorer.removeItem();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsToHide: TektonNode[] = (explorer as any).itemsToHide;
    expect(itemsToHide.length).equal(1);
  });
});
