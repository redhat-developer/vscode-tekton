/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';
import { ContextType } from '../../src/context-type';

// const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Task', () => {
  const sandbox = sinon.createSandbox();
  const taskNode = new TestItem(TknImpl.ROOT, 'test-task', ContextType.TASKNODE, null);
  const taskItem = new TestItem(taskNode, 'task', ContextType.TASK, null);


  setup(() => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
    sandbox.stub(TektonItem, 'getTaskNames').resolves([taskItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

});
