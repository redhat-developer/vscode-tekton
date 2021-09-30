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
import * as tkn from '../../src/tkn';
import { ContextType } from '../../src/context-type';
import { cli } from '../../src/cli';
import * as telemetry from '../../src/telemetry';
import { TestItem } from '../tekton/testTektonitem';
import { Command } from '../../src/cli-command';
import { openContainerInTerminal } from '../../src/debugger/show-in-terminal';

const expect = chai.expect;
chai.use(sinonChai);

suite('debug/TaskRunContinue', () => {
  const sandbox = sinon.createSandbox();
  let executeInTerminalStub: sinon.SinonStub;
  let cliExecStub: sinon.SinonStub;
  const taskRunNode = new TestItem(TknImpl.ROOT, 'test-task-run', ContextType.TASKRUN, null);

  setup(() => {
    cliExecStub = sandbox.stub(cli, 'execute').resolves({error: null, stdout: JSON.stringify({
      metadata: {
        name: 'test',
        namespace: 'test'
      },
      status: {
        podName: 'test',
        steps: [
          {container: 'test'}
        ]
      }
    }), stderr: ''});
    sandbox.stub(telemetry, 'telemetryLog');
    executeInTerminalStub = sandbox.stub(tkn.tkn, 'executeInTerminal');

  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Debug Fail Continue TaskRun', () => {

    test('return null if no taskRun found', async () => {
      const result = await openContainerInTerminal(null);
      expect(result).equals(null);
    });

    test('Debug and fail continue taskRun', async () => {
      sandbox.stub(vscode.window, 'terminals').resolves([{name: 'Tekton:test-task-run'}]);
      await openContainerInTerminal(taskRunNode);
      expect(cliExecStub).calledOnceWith(Command.getTaskRun(taskRunNode.getName()));
      expect(executeInTerminalStub).calledOnceWith(Command.loginToContainer('test', 'test', 'test'));
    });

  });
});
