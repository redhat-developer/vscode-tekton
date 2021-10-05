/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import sinon = require('sinon');
import { DebugExplorer } from '../../src/debugger/debugExplorer';
import { sessions } from '../../src/debugger/debug-tree-view';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Application Explorer', () => {
  let tektonInstance: DebugExplorer;
  const sandbox = sinon.createSandbox();

  setup(() => {
    tektonInstance = new DebugExplorer();
    sandbox.stub(sessions, 'size').returns(1);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('delegate calls to TektonObject instance', async () => {
    sessions.set('test', {});
    const pipelineNodes = await tektonInstance.getChildren();
    expect(pipelineNodes.length).equals(1);
    sessions.delete('test');
  });

  test('return null if no tree item found', async () => {
    const pipelineNodes = await tektonInstance.getTreeItem(null);
    expect(pipelineNodes).equals(null);
  });
});
