/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { Command, ContextType, TknImpl } from '../../src/tkn';
import { showDiagnosticData } from '../../src/tekton/diagnostic';
import { TestItem } from './testTektonitem';


const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Diagnostic', () => {

  let termStub: sinon.SinonStub;
  let execStub: sinon.SinonStub;
  const sandbox = sinon.createSandbox();
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineRunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  const taskRunItem = new TestItem(pipelineRunItem, 'taskrun', ContextType.TASKRUN, undefined, '2019-07-25T12:03:00Z', 'True');


  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
    termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('show diagnostic', () => {

    test('show diagnostic data for pipelineRun', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify({
        apiVersion: 'tekton.dev/v1beta1',
        kind: 'PipelineRun',
        status: {
          completionTime: '2020-11-05T18:54:50Z',
          taskRuns: {
            'conditional-pr-first-create-file-hw6r8': {
              pipelineTaskName: 'first-create-file',
              status: {
                conditions: [
                  {
                    reason: 'Succeeded'
                  }
                ],
                completionTime: '2020-11-05T18:54:15Z',
                podName: 'conditional-pr-first-create-file-hw6r8-pod-bvpf9',
              }
            },
            'conditional-pr-first-create-file-hw6r87': {
              conditionChecks: {
                'conditional-pipeline-run-bxvnc-then-check-ds46q-file-exis-7wtbz': {
                  status: {
                    conditions: [
                      {
                        reason: 'Failed'
                      }
                    ]
                  }
                }
              },
              pipelineTaskName: 'first-create-file',
              status: {
                conditions: [
                  {
                    reason: 'ConditionCheckFailed'
                  }
                ],
                completionTime: '2020-11-05T18:54:15Z',
                podName: 'conditional-pr-first-create-file-hw6r8-pod-bvpf9',
              }
            }
          }
        }
      }), stderr: '' });
      showQuickPickStub.onFirstCall().resolves({label: 'conditional-pr-first-create-file-hw6r8', podName: 'conditional-pr-first-create-file-hw6r8-pod-bvpf9'})
      await showDiagnosticData(pipelineRunItem);

      expect(termStub).calledOnceWith(Command.showDiagnosticData('conditional-pr-first-create-file-hw6r8-pod-bvpf9'));
    });

    test('show diagnostic data for taskRun', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify({
        'apiVersion': 'tekton.dev/v1beta1',
        'kind': 'TaskRun',
        'status': {
          'completionTime': '2020-11-05T18:54:15Z',
          'podName': 'conditional-pr-first-create-file-hw6r8-pod-bvpf9',
        }
      }), stderr: '' });
      await showDiagnosticData(taskRunItem);
      expect(termStub).calledOnceWith(Command.showDiagnosticData('conditional-pr-first-create-file-hw6r8-pod-bvpf9'));
    });

  });


})
