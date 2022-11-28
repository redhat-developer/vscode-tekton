/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import * as vscode from 'vscode';
import { ContextType } from '../../src/context-type';
import * as telemetry from '../../src/telemetry';
import { TestItem } from '../tekton/testTektonitem';
import { Command } from '../../src/cli-command';
import { startDebugger } from '../../src/debugger/debug';
import * as watchTaskRun from '../../src/debugger/debug-tree-view';

const expect = chai.expect;
chai.use(sinonChai);

suite('debug', () => {
  const sandbox = sinon.createSandbox();
  let showErrorMessageStub: sinon.SinonStub;
  let showWarningMessageStub: sinon.SinonStub;
  let cliExecStub: sinon.SinonStub;
  let watchTaskRunStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let safeDumpStub: sinon.SinonStub;
  const taskRunNode = new TestItem(TknImpl.ROOT, 'test-task-run', ContextType.TASKRUN, null);

  const taskRunData = {
    metadata: {
      'name': 'recipe-time-5kbb6-fetch-the-recipe-wdk4h',
      'namespace': 'tekton-pipelines',
    },
    'spec': {
      'workspaces': [
        {
          'name': 'super-secret-password',
          'secret': {
            'secretName': 'secret-password'
          }
        }
      ]
    },
    'status': {
      'conditions': [
        {
          'reason': 'Succeeded',
          'status': 'True'
        }
      ],
      'podName': 'recipe-time-5kbb6-fetch-the-recipe-wdk4h-pod-msxc9',
      'steps': [
        {
          'container': 'step-fetch-and-write',
          'imageID': 'docker-pullable://ubuntu@sha256:9d6a8699fb5c9c39cf08a0871bd6219f0400981c570894cd8cbea30d3424a31f',
          'name': 'fetch-and-write',
          'terminated': {
            'containerID': 'docker://bcd6533106c1067dca147a11516e9760fed52b5911ddd4a19e16f78e37094cf4',
            'exitCode': 0,
            'finishedAt': '2021-09-28T03:54:00Z',
            'reason': 'Completed',
            'startedAt': '2021-09-28T03:54:00Z'
          }
        }
      ]
    }
  };

  setup(() => {
    sandbox.stub(telemetry, 'telemetryLogError');
    osStub = sandbox.stub(os, 'tmpdir').returns('path');
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    safeDumpStub = sandbox.stub(yaml, 'safeDump').returns('empty');
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
    cliExecStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
    watchTaskRunStub = sandbox.stub(watchTaskRun, 'watchTaskRunContainer').resolves({error: null, stdout: '', stderr: ''});
  });

  teardown(() => {
    sandbox.restore();
  });

  const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.16.3\nTriggers version: v0.5.0\n';


  suite('Debug', () => {

    test('return null if pipeline version is not supported', async () => {
      cliExecStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      const result = await startDebugger(null);
      expect(result).equals(null);
      expect(cliExecStub).calledOnceWith(Command.printTknVersion());
    });

    test('return null if debugger is not enable', async () => {
      const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.26.3\nTriggers version: v0.5.0\n';
      cliExecStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      cliExecStub.onSecondCall().resolves({ error: null, stdout: null, stderr: '' });
      cliExecStub.onThirdCall().resolves({ error: null, stdout: JSON.stringify({
        data: {
          'enable-api-fields': 'stable'  
        }
      }), stderr: '' });
      const result = await startDebugger(taskRunNode);
      expect(result).equals(null);
      showWarningMessageStub.calledOnce;
      expect(cliExecStub).calledThrice;
    });

    test('return null if fail to fetch the feature-flags data', async () => {
      const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.26.3\nTriggers version: v0.5.0\n';
      cliExecStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      cliExecStub.onSecondCall().resolves({ error: null, stdout: null, stderr: '' });
      cliExecStub.onThirdCall().resolves({ error: 'err', stdout: '', stderr: '' });
      const result = await startDebugger(taskRunNode);
      expect(result).equals(null);
      showErrorMessageStub.calledOnce;
      expect(cliExecStub).calledThrice;
    });

    test('return null if fail to create taskRun for debugger', async () => {
      const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.26.3\nTriggers version: v0.5.0\n';
      cliExecStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      cliExecStub.onSecondCall().resolves({ error: null, stdout: null, stderr: '' });
      cliExecStub.onThirdCall().resolves({ error: null, stdout: JSON.stringify({
        data: {
          'enable-api-fields': 'alpha'  
        }
      }), stderr: '' });
      cliExecStub.onCall(3).resolves({ error: null, stdout: JSON.stringify({
        metadata: {
          labels: {
            test: 'test'
          }
        },
        spec: {
          params: {
            name: 'string',
            value: 'string'
          },
          status: 'string'
        }
      }), stderr: '' });
      cliExecStub.onCall(4).resolves({ error: 'err', stdout: null, stderr: '' });
      const result = await startDebugger(taskRunNode);
      expect(result).equals(null);
      showErrorMessageStub.calledOnce;
      safeDumpStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
      unlinkStub.calledOnce;
    });

    test('start taskRun in debug mode', async () => {
      const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.26.3\nTriggers version: v0.5.0\n';
      cliExecStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      cliExecStub.onSecondCall().resolves({ error: null, stdout: null, stderr: '' });
      cliExecStub.onThirdCall().resolves({ error: null, stdout: JSON.stringify({
        data: {
          'enable-api-fields': 'alpha'  
        }
      }), stderr: '' });
      cliExecStub.onCall(3).resolves({ error: null, stdout: JSON.stringify({
        metadata: {
          labels: {
            test: 'test'
          }
        },
        spec: {
          params: {
            name: 'string',
            value: 'string'
          },
          status: 'string'
        }
      }), stderr: '' });
      cliExecStub.onCall(4).resolves({ error: null, stdout: JSON.stringify(taskRunData), stderr: '' });
      await startDebugger(taskRunNode);
      safeDumpStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
      unlinkStub.calledOnce;
      watchTaskRunStub.calledOnce;
    });
  });
});
