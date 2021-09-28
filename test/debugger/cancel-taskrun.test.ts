/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import * as vscode from 'vscode';
import { ContextType } from '../../src/context-type';
import { cli } from '../../src/cli';
import * as telemetry from '../../src/telemetry';
import { TestItem } from '../tekton/testTektonitem';
import { cancelTaskRun } from '../../src/debugger/cancel-taskrun';
import { sessions } from '../../src/debugger/debug-tree-view';
import { Command } from '../../src/cli-command';

const expect = chai.expect;
chai.use(sinonChai);

suite('debug/TaskRunCancel', () => {
  const sandbox = sinon.createSandbox();
  let showErrorMessageStub: sinon.SinonStub;
  let cliExecStub: sinon.SinonStub;
  const taskRunNode = new TestItem(TknImpl.ROOT, 'test-task-run', ContextType.TASKRUN, null);

  setup(() => {
    sandbox.stub(telemetry, 'telemetryLogError');
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    cliExecStub = sandbox.stub(cli, 'execute').resolves({error: null, stdout: '', stderr: ''});
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Cancel TaskRun', () => {

    test('exit from debugger', async () => {
      const result = await cancelTaskRun(null);
      expect(result).equals(null);
    });

    test('exit from debugger', async () => {
      sandbox.stub(sessions, 'get').returns({resourceName: 'test-task-run'});
      await cancelTaskRun(taskRunNode);
      expect(cliExecStub).calledOnceWith(Command.cancelTaskRun('test-task-run'));
    });

    test('check if any error appear exit from debugger', async () => {
      sandbox.stub(sessions, 'get').returns({resourceName: 'test-task-run'});
      cliExecStub.resolves({error: 'fails'})
      const result = await cancelTaskRun(taskRunNode);
      showErrorMessageStub.calledOnce;
      expect(result).equals(null);
    });
  });
});
