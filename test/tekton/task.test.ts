/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import { Task } from '../../src/tekton/task';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';
import { Command } from '../../src/util/command';
import { ContextType } from '../../src/context-type';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Task', () => {
  const sandbox = sinon.createSandbox();
  let getTaskStub: sinon.SinonStub;
  const taskNode = new TestItem(TknImpl.ROOT, 'test-task', ContextType.TASKNODE, null);
  const taskItem = new TestItem(taskNode, 'task', ContextType.TASK, null);


  setup(() => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskItem]);
    getTaskStub = sandbox.stub(TektonItem, 'getTaskNames').resolves([taskItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  let termStub: sinon.SinonStub;

  setup(() => {
    termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
  });

  suite('called from \'Tekton Pipelines Explorer\'', () => {

    test('executes the list tkn command in terminal', async () => {
      await Task.list();
      expect(termStub).calledOnceWith(Command.listTasksInTerminal());
    });

  });

  suite('called from command palette', () => {

    test('calls the appropriate error message when no task found', async () => {
      getTaskStub.restore();
      sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
      try {
        await Task.list();
      } catch (err) {
        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
        return;
      }
    });
  });
});
