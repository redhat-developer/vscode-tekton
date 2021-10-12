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
import * as telemetry from '../../src/telemetry';
import { TestItem } from '../tekton/testTektonitem';
import { sessions } from '../../src/debugger/debug-tree-view';
import { Command } from '../../src/cli-command';
import { showDebugFailContinue } from '../../src/debugger/debug-fail-continue';

const expect = chai.expect;
chai.use(sinonChai);

suite('debug/TaskRunContinue', () => {
  const sandbox = sinon.createSandbox();
  let showErrorMessageStub: sinon.SinonStub;
  let cliExecStub: sinon.SinonStub;
  const taskRunNode = new TestItem(TknImpl.ROOT, 'test-task-run', ContextType.TASKRUN, null);

  setup(() => {
    sandbox.stub(telemetry, 'telemetryLogError');
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    cliExecStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Debug Fail Continue TaskRun', () => {

    test('return null if no taskRun found', async () => {
      const result = await showDebugFailContinue(null);
      expect(result).equals(null);
    });

    test('Debug and fail continue taskRun', async () => {
      sandbox.stub(sessions, 'get').returns({containerName: 'test-task-run', podName: 'test', namespace: 'test'});
      await showDebugFailContinue(taskRunNode);
      expect(cliExecStub).calledOnceWith(Command.debugFailContinue('test-task-run', 'test', 'test'));
    });

    test('check if any error appear from debugger', async () => {
      sandbox.stub(sessions, 'get').returns({resourceName: 'test-task-run'});
      cliExecStub.resolves({error: 'fails'})
      const result = await showDebugFailContinue(taskRunNode);
      showErrorMessageStub.calledOnce;
      expect(result).equals(null);
    });
  });
});
