/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { Task } from '../../src/tekton/task';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Task', () => {
  let sandbox: sinon.SinonSandbox;
  let execStub: sinon.SinonStub;
  let getTaskStub: sinon.SinonStub;
  const taskNode = new TestItem(TknImpl.ROOT, 'test-task', ContextType.TASKNODE, null);
  const taskItem = new TestItem(taskNode, 'task', ContextType.TASK, null);


  setup(() => {
    sandbox = sinon.createSandbox();
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
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
      await Task.list(taskItem);
      expect(termStub).calledOnceWith(Command.listTasksinTerminal());
    });

  });

  suite('called from command palette', () => {

    test('calls the appropriate error message when no task found', async () => {
      getTaskStub.restore();
      sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
      try {
        await Task.list(null);
      } catch (err) {
        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
        return;
      }
    });
  });

  suite('delete command', () => {
    let warnStub: sinon.SinonStub;

    setup(() => {
      warnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
    });

    test('calls the appropriate tkn command if confirmed', async () => {
      warnStub.resolves('Yes');

      await Task.delete(taskItem);

      expect(execStub).calledOnceWith(Command.deleteTask(taskItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await Task.delete(taskItem);

      expect(result).equals(`The Task '${taskItem.getName()}' successfully deleted.`);
    });

    test('returns null when cancelled', async() => {
      warnStub.resolves('Cancel');

      const result = await Task.delete(taskItem);

      expect(result).null;
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError;
      try {
        await Task.delete(taskItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the Task '${taskItem.getName()}': 'ERROR'.`);
    });
  });
});
