/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TestItem } from './testTektonitem';
import { TaskRun } from '../../src/tekton/taskrun';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { TektonItem } from '../../src/tekton/tektonitem';
import { cli, CliExitData } from '../../src/cli';
import * as logInEditor from '../../src/util/log-in-editor';
import { Platform } from '../../src/util/platform';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/TaskRun', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let quote: string;
  let showErrorMessageStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let getPipelineRunNamesStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineRunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  const taskRunItem = new TestItem(pipelineRunItem, 'taskrun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  let showLogInEditorStub: sinon.SinonStub;
  let configurationStub: sinon.SinonStub;
  let cliExecuteStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;

  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);
    getPipelineRunNamesStub = sandbox.stub(TektonItem, 'getPipelineRunNames').resolves([pipelineRunItem]);
    sandbox.stub(TknImpl.prototype, 'getPipelineRunsList').resolves([pipelineRunItem]);
    sandbox.stub(TknImpl.prototype, 'getTasks').resolves([taskRunItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
    cliExecuteStub = sandbox.stub(cli, 'execute');
    osStub = sandbox.stub(os, 'tmpdir').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
    showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    quote = Platform.OS === 'win32' ? '"' : '\'';
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    showLogInEditorStub = sandbox.stub(logInEditor, 'showLogInEditor').resolves();
    configurationStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({ get: () => false } as unknown as vscode.WorkspaceConfiguration);
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('list command', () => {
    let termStub: sinon.SinonStub;

    setup(() => {
      termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

      test('executes the list tkn command in terminal', async () => {
        await TaskRun.listFromPipelineRun(taskRunItem);
        expect(termStub).calledOnceWith(Command.listTaskRunsForPipelineRunInTerminal(taskRunItem.getName()));
      });

    });

    suite('called from command palette', () => {

      test('calls the appropriate error message when no project found', async () => {
        getPipelineRunNamesStub.restore();
        try {
          await TaskRun.listFromPipelineRun(null);
        } catch (err) {
          expect(err.message).equals('You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.');
          return;
        }
      });
    });

    suite('called from command bar', () => {

      teardown(() => {
        termStub.restore();
      });

      test('skips tkn command execution if canceled by user', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        await TaskRun.listFromPipelineRun(null);
        // tslint:disable-next-line: no-unused-expression
        expect(termStub).not.called;
      });

    });

    suite('listFromTasks command', () => {
      const taskItem = new TestItem(null, 'task', ContextType.TASK);

      suite('called from \'Tekton Pipelines Explorer\'', () => {

        test('executes the listFromTasks tkn command in terminal', async () => {
          await TaskRun.listFromTask(taskItem);
          expect(termStub).calledOnceWith(Command.listTaskRunsForTasksInTerminal(taskItem.getName()));
        });

      });

      suite('called from command palette', () => {

        test('calls the appropriate error message when no project found', async () => {
          sandbox.stub(TknImpl.prototype, 'getTaskRunsForTasks').resolves([]);
          try {
            await TaskRun.listFromTask(null);
          } catch (err) {
            expect(err.message).equals('You need at least one Task available. Please create new Tekton Task and try again.');
            return;
          }
        });
      });

      suite('called from command bar', () => {

        test('skips tkn command execution if canceled by user', async () => {
          showQuickPickStub.onFirstCall().resolves(undefined);
          await TaskRun.listFromTask(null);
          // tslint:disable-next-line: no-unused-expression
          expect(termStub).not.called;
        });
      });
    });


    suite('log output', () => {

      test('Log calls the correct tkn command in terminal  w/ context', async () => {
        await TaskRun.logs(taskRunItem);

        expect(termStub).calledOnceWith(Command.showTaskRunLogs(taskRunItem.getName()));
        termStub.restore();
      });

      test('Show log in editor', async () => {
        configurationStub.returns({ get: () => true } as unknown as vscode.WorkspaceConfiguration);
        await TaskRun.logs(taskRunItem);
        expect(showLogInEditorStub).calledOnceWith(Command.showTaskRunLogs(taskRunItem.getName()));
      });

    });

    suite('followLog', () => {

      test('followLog calls the correct tkn command in terminal', async () => {
        await TaskRun.followLogs(taskRunItem);

        expect(termStub).calledOnceWith(Command.showTaskRunFollowLogs(taskRunItem.getName()));
      });

      test('Show followLog log in editor', async () => {
        configurationStub.returns({ get: () => true } as unknown as vscode.WorkspaceConfiguration);
        await TaskRun.followLogs(taskRunItem);

        expect(showLogInEditorStub).calledOnceWith(Command.showTaskRunFollowLogs(taskRunItem.getName()));
      });

    });
  });

  suite('Open Task Definition', () => {

    let loadTektonResourceStub: sinon.SinonStub;
    setup(() => {
      loadTektonResourceStub = sandbox.stub(TektonItem, 'loadTektonResource')
    });

    test('openDefinition should ask taskrun definition', async () => {
      execStub.resolves({ stdout: '{"metadata":{"labels": {"tekton.dev/task": "FooTaskName"}}, "spec":{"taskRef":{"kind": "FooKind"}}}' } as CliExitData);
      loadTektonResourceStub.returns(undefined);

      await TaskRun.openDefinition(taskRunItem);

      expect(execStub).calledOnceWith(Command.getTaskRun(taskRunItem.getName()));
      expect(loadTektonResourceStub).calledOnceWith('FooKind', 'FooTaskName');
    });

    test('openDefinition should check errors on fetching taskrun definition', async () => {
      execStub.resolves({ error: 'Foo error' } as CliExitData);
      loadTektonResourceStub.returns(undefined);

      await TaskRun.openDefinition(taskRunItem);

      expect(execStub).calledOnceWith(Command.getTaskRun(taskRunItem.getName()));
      expect(loadTektonResourceStub).not.called;
      expect(showErrorMessageStub).calledOnceWith('TaskRun may not have started yet, try again when it starts running. "Foo error"');
    });

    test('openDefinition should show error if trying to open condition taskrun', async () => {
      execStub.resolves({ stdout: '{"metadata":{"labels": {"tekton.dev/task": "FooTaskName","tekton.dev/conditionCheck": "bar-condition-run"}}, "spec":{"taskRef":{"kind": "FooKind"}}}' } as CliExitData);
      loadTektonResourceStub.returns(undefined);

      await TaskRun.openDefinition(taskRunItem);

      expect(execStub).calledOnceWith(Command.getTaskRun(taskRunItem.getName()));
      expect(loadTektonResourceStub).not.called;
      expect(showErrorMessageStub).calledOnceWith('Cannot find Condition definition for: taskrun. Please look in Pipeline definition');
    });
  });

  suite('Open Task Definition', () => {

    test('Restart taskRun', async () => {
      execStub.onFirstCall().resolves({ stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind: 'TaskRun',
        metadata: {
          name: 'send-cloud-event',
        },
        spec: {
          resources: {
            outputs: [
              {
                name: 'myimage',
                resourceSpec: {
                  params: [
                    {
                      name: 'url',
                      value: 'fake'
                    }
                  ]
                }
              }
            ]
          },
          serviceAccountName: 'default',
          taskRef: {
            kind: 'Task',
            name: 'send-cloud-event-task'
          },
        }
      })});
      osStub.returns('path');
      cliExecuteStub.resolves({ stdout: 'successfully created'});
      await TaskRun.restartTaskRun(taskRunItem);
      unlinkStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
      showInformationMessageStub.calledOnce;
      const mockFilePath = path.join('path', `${taskRunItem.getName()}-.yaml`);
      expect(cliExecuteStub).calledOnceWith(Command.create(`${quote}${mockFilePath}${quote}`));
      expect(showInformationMessageStub).calledOnceWith('TaskRun successfully restarted');
    });

    test('show error message if fails to restart taskRun', async () => {
      execStub.onFirstCall().resolves({ stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind: 'TaskRun',
        metadata: {
          name: 'send-cloud-event',
        },
        spec: {
          resources: {
            outputs: [
              {
                name: 'myimage',
                resourceSpec: {
                  params: [
                    {
                      name: 'url',
                      value: 'fake'
                    }
                  ]
                }
              }
            ]
          },
          serviceAccountName: 'default',
          taskRef: {
            kind: 'Task',
            name: 'send-cloud-event-task'
          },
        }
      })});
      osStub.returns('path');
      cliExecuteStub.resolves({ error: 'fails'});
      await TaskRun.restartTaskRun(taskRunItem);
      unlinkStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
      showErrorMessageStub.calledOnce;
      const mockFilePath = path.join('path', `${taskRunItem.getName()}-.yaml`);
      expect(cliExecuteStub).calledOnceWith(Command.create(`${quote}${mockFilePath}${quote}`));
      expect(showErrorMessageStub).calledOnceWith('Fail to restart TaskRun: fails');
    });

  });

});
