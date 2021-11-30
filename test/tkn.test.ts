/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as tkn from '../src/tkn';
import { CliImpl, createCliCommand } from '../src/cli';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as assert from 'assert';
import { ToolsConfig } from '../src/tools';
import { WindowUtil } from '../src/util/windowUtils';
import { commands, Terminal, TreeItemCollapsibleState } from 'vscode';
import { TestItem } from './tekton/testTektonitem';
import { ExecException } from 'child_process';
import * as path from 'path';
import { PipelineRunData } from '../src/tekton';
import { ContextType } from '../src/context-type';
import { TektonNode, TektonNodeImpl } from '../src/tree-view/tekton-node';
import { PipelineRun } from '../src/tree-view/pipelinerun-node';
import { MoreNode } from '../src/tree-view/expand-node';
import { Command } from '../src/cli-command';
import * as telemetry from '../src/telemetry';

const expect = chai.expect;
chai.use(sinonChai);

// This needs to be edited to actually make sense wrt Tasks/TaskRuns in particular and nesting of resources
suite('tkn', () => {
  const tknCli: tkn.Tkn = tkn.tkn;
  const sandbox = sinon.createSandbox();
  const errorMessage = 'Error';
  let execStubCli: sinon.SinonStub;

  setup(() => {
    sandbox.stub(telemetry, 'telemetryLog');
    sandbox.stub(telemetry, 'telemetryLogError');
    sandbox.stub(ToolsConfig, 'getVersion').resolves('0.2.0');
    execStubCli = sandbox.stub(CliImpl.prototype, 'execute').resolves();
    sandbox.stub(ToolsConfig, 'getTknLocation').returns('kubectl');
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('command execution', () => {
    let toolsStub: sinon.SinonStub;
    const command = createCliCommand('tkn', 'do', 'whatever', 'you', 'do');

    setup(() => {
      toolsStub = sandbox.stub(ToolsConfig, 'detectOrDownload').resolves();
    });

    test('execute calls the given command in shell', async () => {
      const data = { stdout: 'done', error: null };
      execStubCli.resolves(data);
      const result = await tknCli.execute(command);

      expect(execStubCli).calledOnceWith(command);
      expect(result).deep.equals(data);
    });

    test('execute calls command with its detected location', async () => {
      const toolPath = 'path/to/tool/tool';
      execStubCli.resolves({ stdout: 'done', error: null });
      toolsStub.resolves(toolPath);
      await tknCli.execute(command);
      // eslint-disable-next-line require-atomic-updates
      command.cliCommand = command.cliCommand.replace('tkn', `"${toolPath}"`);
      expect(execStubCli).calledOnceWith(command);
    });

    test('execute allows to set its working directory', async () => {
      execStubCli.resolves({ stdout: 'done', error: null });
      const cwd = 'path/to/some/dir';
      await tknCli.execute(command, cwd);

      expect(execStubCli).calledOnceWith(command, { cwd: cwd });
    });

    test('execute rejects if an error occurs in the shell command', async () => {
      const err: ExecException = { message: 'ERROR', name: 'err' };
      execStubCli.resolves({ error: err, stdout: '' });
      try {
        await tknCli.execute(command);
        expect.fail();
      } catch (error) {
        expect(error).equals(err);
      }
    });

    test('execute can be set to pass errors through exit data', async () => {
      const err: ExecException = { message: 'ERROR', name: 'err' };
      execStubCli.resolves({ error: err, stdout: '' });
      const result = await tknCli.execute(command, null, false);

      expect(result).deep.equals({ error: err, stdout: '' });
    });

    test('executeInTerminal send command to terminal and shows it', async () => {
      const termFake: Terminal = {
        name: 'name',
        creationOptions: {},
        exitStatus: undefined,
        processId: Promise.resolve(1),
        sendText: sinon.stub(),
        show: sinon.stub(),
        hide: sinon.stub(),
        dispose: sinon.stub(),
        state: undefined
      };
      toolsStub.restore();
      toolsStub = sandbox.stub(ToolsConfig, 'detectOrDownload').resolves(path.join('segment1', 'segment2'));
      const ctStub = sandbox.stub(WindowUtil, 'createTerminal').returns(termFake);
      await tknCli.executeInTerminal(createCliCommand('tkn'));
      expect(termFake.show).calledOnce;
      expect(ctStub).calledWith('Tekton', process.cwd(), 'segment1');
    });
  });

  suite('item listings', () => {
    let execStub: sinon.SinonStub;
    const pipelineNodeItem = new TestItem(tkn.TknImpl.ROOT, 'pipelinenode', ContextType.PIPELINENODE);
    const pipelineItem1 = new TestItem(pipelineNodeItem, 'pipeline1', ContextType.PIPELINE);
    const taskNodeItem = new TestItem(tkn.TknImpl.ROOT, 'tasknode', ContextType.TASKNODE);
    const taskItem = new TestItem(taskNodeItem, 'task1', ContextType.TASK);
    const clustertaskNodeItem = new TestItem(tkn.TknImpl.ROOT, 'clustertasknode', ContextType.CLUSTERTASKNODE);
    const clustertaskItem = new TestItem(clustertaskNodeItem, 'clustertask1', ContextType.CLUSTERTASK);
    const triggerTemplatesItem = new TestItem(tkn.TknImpl.ROOT, 'triggertemplates', ContextType.TRIGGERTEMPLATES);
    const triggerBindingItem = new TestItem(tkn.TknImpl.ROOT, 'triggerbinding', ContextType.TRIGGERBINDING);
    const eventListenerItem = new TestItem(tkn.TknImpl.ROOT, 'eventlistener', ContextType.EVENTLISTENER);
    const conditionItem = new TestItem(tkn.TknImpl.ROOT, 'condition', ContextType.CONDITIONS);
    const pipelineRunNodeItem = new TestItem(tkn.TknImpl.ROOT, 'PipelineRun', ContextType.PIPELINERUNNODE);
    const taskRunNodeItem = new TestItem(tkn.TknImpl.ROOT, 'TaskRun', ContextType.TASKRUNNODE);

    setup(() => {
      execStub = sandbox.stub(tknCli, 'execute');
    });

    test('getPipelines returns items from tkn pipeline list command', async () => {
      const tknPipelines = ['pipeline1', 'pipeline2', 'pipeline3'];
      execStub.onFirstCall().resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'Pipeline',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'pipeline1'
            }
          }, {
            'kind': 'Pipeline',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'pipeline2'
            }
          }, {
            'kind': 'Pipeline',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'pipeline3'
            }
          }]
        })
      });
      const result = await tknCli.getPipelines(pipelineNodeItem);

      expect(execStub).calledOnceWith(Command.listPipelines());
      expect(result.length).equals(3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelines[i]);
      }
    });

    test('getPipelines returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getPipelines').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getPipelines(pipelineNodeItem);
      expect(result).empty;
    });

    test('getPipelineRunList returns items from tkn list command', async () => {
      const tknPipelineRun = ['pipelineRun1'];
      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          items: [
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun1'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
                'taskRuns': {
                  'pipelinerun1-test-taskrun1-a1bcd': {
                    'pipelineTaskName': 'taskrun1',
                    'status': {
                      'conditions': [{
                        'status': 'True'
                      }],
                      'startTime': '2019-07-25T12:03:01Z'
                    }
                  },
                  'pipelinerun1-test-taskrun2-a1bcd': {
                    'pipelineTaskName': 'taskrun2',
                    'status': {
                      'conditions': [{
                        'status': 'True'
                      }],

                      'startTime': '2019-07-25T12:03:02Z'
                    }
                  }
                }
              }
            }]
        })
      });
      const result = await tknCli.getPipelineRunsList(pipelineRunNodeItem);

      expect(execStub).calledOnceWith(Command.listPipelineRun());
      expect(result.length).equals(1);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelineRun[i]);
      }
    });

    test('getPipelineRunList returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getPipelineRunsList').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getPipelineRunsList(pipelineRunNodeItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getCondition returns items from tkn trigger templates list command', async () => {
      const tknPipelines = ['condition1', 'condition2', 'condition3'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'Condition',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'condition1'
            }
          }, {
            'kind': 'Condition',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'condition2'
            }
          }, {
            'kind': 'Condition',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'condition3'
            }
          }]
        })
      });
      const result = await tknCli.getConditions(conditionItem);

      expect(execStub).calledOnceWith(Command.listConditions());
      expect(result.length).equals(3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelines[i]);
      }
    });

    test('getCondition returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getConditions').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getConditions(conditionItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });


    test('getTriggerTemplates returns items from tkn trigger templates list command', async () => {
      const tknPipelines = ['triggertemplates1', 'triggertemplates2', 'triggertemplates3'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'TriggerTemplates',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'triggertemplates1'
            }
          }, {
            'kind': 'TriggerTemplates',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'triggertemplates2'
            }
          }, {
            'kind': 'TriggerTemplates',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'triggertemplates3'
            }
          }]
        })
      });
      const result = await tknCli.getTriggerTemplates(triggerTemplatesItem);

      expect(execStub).calledOnceWith(Command.listTriggerTemplates());
      expect(result.length).equals(3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelines[i]);
      }
    });

    test('getTriggerTemplates returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getTriggerTemplates').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getTriggerTemplates(triggerTemplatesItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getTriggerBinding returns items from tkn trigger binding list command', async () => {
      const tknPipelines = ['triggerBinding1'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'TriggerBinding',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'triggerBinding1'
            }
          }]
        })
      });
      const result = await tknCli.getTriggerBinding(triggerBindingItem);

      expect(execStub).calledOnceWith(Command.listTriggerBinding());
      expect(result.length).equals(1);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelines[i]);
      }
    });

    test('getTriggerBinding returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getTriggerBinding').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getTriggerBinding(triggerBindingItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getEventListener returns items from tkn event listener list command', async () => {
      const tknPipelines = ['eventlistener1'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'EventListener',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'eventlistener1'
            }
          }]
        })
      });
      const result = await tknCli.getEventListener(eventListenerItem);

      expect(execStub).calledOnceWith(Command.listEventListener());
      expect(result.length).equals(1);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelines[i]);
      }
    });

    test('getEventListener returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getEventListener').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getEventListener(eventListenerItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getTasks returns items from tkn task list command', async () => {
      const tknTasks = ['task1', 'task2'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'Task',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'task1'
            }
          }, {
            'kind': 'Task',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'task2'
            }
          }]
        })
      });
      const result = await tknCli.getTasks(taskNodeItem);

      expect(execStub).calledOnceWith(Command.listTasks());
      expect(result.length).equals(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknTasks[i]);
      }
    });

    test('getTasks returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getTasks').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getTasks(taskNodeItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getClusterTasks returns items from tkn task list command', async () => {
      const tknTasks = ['clustertask1', 'clustertask2'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [{
            'kind': 'ClusterTask',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask1'
            }
          }, {
            'kind': 'Task',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask2'
            }
          }]
        })
      });
      const result = await tknCli.getClusterTasks(clustertaskNodeItem);

      expect(execStub).calledOnceWith(Command.listClusterTasks());
      expect(result.length).equals(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknTasks[i]);
      }
    });

    test('getClusterTasks returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getClusterTasks').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getTasks(clustertaskNodeItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });


    test('getPipelineRuns returns pipelineruns for a pipeline', async () => {
      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          items: [
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun1'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
                'taskRuns': {
                  'pipelinerun1-test-taskrun1-a1bcd': {
                    'pipelineTaskName': 'taskrun1',
                    'status': {
                      'conditions': [{
                        'status': 'True'
                      }],
                      'startTime': '2019-07-25T12:03:01Z'
                    }
                  },
                  'pipelinerun1-test-taskrun2-a1bcd': {
                    'pipelineTaskName': 'taskrun2',
                    'status': {
                      'conditions': [{
                        'status': 'True'
                      }],

                      'startTime': '2019-07-25T12:03:02Z'
                    }
                  }
                }
              }
            }]
        })
      });
      const result = await tknCli.getPipelineRuns(pipelineItem1);
      expect(result.length).equals(1);
      expect(result[0].getName()).equals('pipelinerun1');
    });

    test('getPipelineRuns returns empty list if no tkn pipelineruns are present', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getPipelineRuns').resolves([]);
      execStub.resolves({
        error: undefined,
        stdout: JSON.stringify({
          items: []
        }
        ),
      });
      const result = await tknCli.getPipelineRuns(pipelineNodeItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getPipelineRuns returns list sorted newest first', async () => {
      const tknPipelinesRuns = ['pipelinerun2', 'pipelinerun1'];
      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          items: [
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun1'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
                'taskRuns': {
                }
              }
            },
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun2'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:11Z',
                'taskRuns': {
                }
              }
            }]
        })
      });

      const result = await tknCli.getPipelineRuns(pipelineItem1);
      expect(result.length).equals(2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelinesRuns[i]);
      }
    });

    test('getPipelineRuns returns "more" item', async () => {
      const tknPipelinesRuns = ['pipelinerun2', 'more'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.replace(tknCli as any, 'defaultPageSize', 1);
      const pipelineItem1 = new TestItem(pipelineNodeItem, 'pipeline1', ContextType.PIPELINE);



      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          items: [
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun1'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
                'taskRuns': {
                }
              }
            },
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun2'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:11Z',
                'taskRuns': {
                }
              }
            }]
        })
      });



      const result = await tknCli.getPipelineRuns(pipelineItem1);
      expect(result.length).equals(2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].getName()).equals(tknPipelinesRuns[i]);
      }
    });

    test('getPipelineRuns set visible item default', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.replace(tknCli as any, 'defaultPageSize', 42);
      const pipelineItem1 = new TestItem(pipelineNodeItem, 'pipeline1', ContextType.PIPELINE);



      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          items: [
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun1'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
                'taskRuns': {
                }
              }
            },
            {
              'kind': 'PipelineRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'name': 'pipelinerun2'
              },
              'spec': {
                'pipelineRef': {
                  'name': 'pipeline1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:11Z',
                'taskRuns': {
                }
              }
            }]
        })
      });



      const result = await tknCli.getPipelineRuns(pipelineItem1);
      expect(result.length).equals(2);
      expect((pipelineItem1 as TektonNode).visibleChildren).to.equals(42);
    });

    test('getTaskRunList returns items from tkn list command', async () => {
      const tknTaskRun = ['taskrun1', 'taskrun2'];
      execStub.resolves({
        error: null,
        stdout: JSON.stringify({
          'items': [
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:01Z',
                'name': 'taskrun1',
                'ownerReferences': [{
                  'kind': 'PipelineRun',
                  'name': 'pipelinerun1'
                }],
                'labels': {
                  'tekton.dev/pipelineRun': 'pipelinerun1'
                }

              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:01Z',
              }
            },
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:00Z',
                'name': 'taskrun2',
                'ownerReferences': [{
                  'kind': 'PipelineRun',
                  'name': 'pipelinerun1'
                }],
                'labels': {
                  'tekton.dev/pipelineRun': 'pipelinerun1'
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
              }
            }]
        })
      });
      const result = await tknCli.getTaskRunList(taskRunNodeItem);

      expect(execStub).calledOnceWith(Command.listTaskRun());
      expect(result.length).equals(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getName()).equals(tknTaskRun[i]);
      }
    });

    test('getTaskRunList returns empty list if tkn produces no output', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getTaskRunList').resolves([]);
      execStub.resolves({ stdout: '', error: null });
      const result = await tknCli.getTaskRunList(taskRunNodeItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getTaskRunFromTasks returns taskrun list for a task', async () => {
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:01Z',
                'name': 'taskrun1',
                'labels': {
                  'tekton.dev/pipelineTask': 'task1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'task1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:01Z',
              }
            },
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:00Z',
                'name': 'taskrun2',
                'labels': {
                  'tekton.dev/pipelineTask': 'task1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'task1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
              }
            }]
        })
      });
      const result = await tknCli.getTaskRunsForTasks(taskItem);

      expect(result.length).equals(2);
      expect(result[0].getName()).equals('taskrun1');
    });

    test('getTaskrunsFromTasks returns taskruns for a task', async () => {
      const tknTaskRuns = ['taskrun1', 'taskrun2'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:01Z',
                'name': 'taskrun1',
                'labels': {
                  'tekton.dev/pipelineTask': 'task1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'task1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:01Z',
              }
            },
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:00Z',
                'name': 'taskrun2',
                'labels': {
                  'tekton.dev/pipelineTask': 'task1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'task1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
              }
            }]
        })
      });
      const result = await tknCli.getTaskRunsForTasks(taskItem);
      expect(execStub).calledWith(Command.listTaskRunsForTasks(taskItem.getName()));
      expect(result.length).equals(2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].getName()).equals(tknTaskRuns[i]);
      }
    });

    test('getTaskrunsFromTasks returns an empty list if an error occurs', async () => {
      sandbox.stub(tkn.TknImpl.prototype, 'getTaskRunsForTasks').resolves([]);
      execStub.onFirstCall().resolves({ error: undefined, stdout: '' });
      execStub.onSecondCall().rejects(errorMessage);
      const result = await tknCli.getTaskRunsForTasks(taskItem);

      // tslint:disable-next-line: no-unused-expression
      expect(result).empty;
    });

    test('getTaskRunFromTasks returns taskrun list for a clustertask', async () => {
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:01Z',
                'name': 'taskrun1',
                'labels': {
                  'tekton.dev/pipelineTask': 'clustertask1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'clustertask1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:01Z',
              }
            },
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:00Z',
                'name': 'taskrun2',
                'labels': {
                  'tekton.dev/pipelineTask': 'clustertask1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'clustertask1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
              }
            }]
        })
      });
      const result = await tknCli.getTaskRunsForTasks(clustertaskItem);

      expect(result.length).equals(2);
      expect(result[0].getName()).equals('taskrun1');
    });

    test('getTaskrunsFromTasks returns taskruns for a clustertask', async () => {
      const tknTaskRuns = ['taskrun1', 'taskrun2'];
      execStub.resolves({
        error: null, stdout: JSON.stringify({
          'items': [
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:01Z',
                'name': 'taskrun1',
                'labels': {
                  'tekton.dev/pipelineTask': 'clustertask1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'clustertask1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:01Z',
              }
            },
            {
              'kind': 'TaskRun',
              'apiVersion': 'tekton.dev/v1alpha1',
              'metadata': {
                'creationTimestamp': '2019-07-25T12:03:00Z',
                'name': 'taskrun2',
                'labels': {
                  'tekton.dev/pipelineTask': 'clustertask1'
                }
              },
              'spec': {
                'taskRef': {
                  'name': 'clustertask1',
                }
              },
              'status': {
                'conditions': [
                  {
                    'status': 'True',
                  }
                ],
                'startTime': '2019-07-25T12:03:00Z',
              }
            }]
        })
      });
      const result = await tknCli.getTaskRunsForTasks(clustertaskItem);
      expect(execStub).calledWith(Command.listTaskRunsForTasks(clustertaskItem.getName()));
      expect(result.length).equals(2);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].getName()).equals(tknTaskRuns[i]);
      }
    });


    test('getRawClusterTasks returns items from tkn task list command', async () => {
      const tknTasks = ['clustertask1', 'clustertask2'];
      execStub.resolves({
        error: null, stderr: '', stdout: JSON.stringify({
          'items': [{
            'kind': 'ClusterTask',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask1'
            }
          }, {
            'kind': 'Task',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask2'
            }
          }]
        })
      });
      const result = await tknCli.getRawClusterTasks();

      expect(execStub).calledOnceWith(Command.listClusterTasks());
      expect(result.length).equals(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].metadata.name).equals(tknTasks[i]);
      }
    });

    test('getRawTasks returns items from tkn task list command', async () => {
      const tknTasks = ['clustertask1', 'clustertask2'];
      execStub.resolves({
        error: null, stderr: '', stdout: JSON.stringify({
          'items': [{
            'kind': 'ClusterTask',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask1'
            }
          }, {
            'kind': 'Task',
            'apiVersion': 'tekton.dev/v1alpha1',
            'metadata': {
              'name': 'clustertask2'
            }
          }]
        })
      });
      const result = await tknCli.getRawTasks();

      expect(execStub).calledOnceWith(Command.listTasks());
      expect(result.length).equals(2);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].metadata.name).equals(tknTasks[i]);
      }
    });
  });

  suite('getPipelineNodes', () => {

    let execStub: sinon.SinonStub;
    let commandsStub: sinon.SinonStub;

    setup(() => {
      commandsStub = sandbox.stub(commands, 'executeCommand');
      execStub = sandbox.stub(tknCli, 'execute');
    });

    test('show warning message if user doesn\'t have the privileges to interact with tekton resources', async () => {
      execStub.onFirstCall().resolves({ error: undefined, stdout: 'no' });
      const result = await tknCli.getPipelineNodes();
      assert.equal(result[0].getName(), 'The current user doesn\'t have the privileges to interact with tekton resources.');
    });

    test('show warning message if pipelines operator is not installed', async () => {
      commandsStub.onFirstCall().resolves(false);
      commandsStub.onSecondCall().resolves(true);
      execStub.onFirstCall().resolves({ error: 'error: the server doesn\'t have a resource type \'pipeline\'', stdout: '' });
      await tknCli.getPipelineNodes();
      expect(commandsStub).calledTwice;
    });
  });

  suite('more node', () => {
    const pipelineNodeItem = new TestItem(tkn.TknImpl.ROOT, 'pipelinenode', ContextType.PIPELINENODE);
    const pipelineItem = new TestItem(pipelineNodeItem, 'pipeline1', ContextType.PIPELINE);

    test('more node has command', () => {
      const more = new MoreNode(4, 10, pipelineItem);
      const moreCommand = more.command;
      assert.equal(moreCommand.command, '_tekton.explorer.more');
    });

    test('more node has command arguments', () => {
      const more = new MoreNode(4, 10, pipelineItem);
      const moreCommand = more.command;
      assert.deepEqual(moreCommand.arguments, [4, pipelineItem]);
    });

    test('more node has name', () => {
      const more = new MoreNode(4, 10, pipelineItem);
      assert.equal(more.getName(), 'more');
    });

    test('more node has description', () => {
      const more = new MoreNode(4, 10, pipelineItem);
      assert.equal(more.description, '4 from 10');
    });
  });

  suite('PipelineRun node', () => {
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);

    test('PipelineRun should use pipelinerun JSON to create TaskRun nodes', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const json = require(path.join('..', '..', 'test', 'pipelinerun.json')) as PipelineRunData;
      const pipelineRun = new PipelineRun(pipelineItem, json.metadata.name, undefined, json, TreeItemCollapsibleState.Expanded);

      expect(pipelineRun.label).equal('condtional-pr');
      const children = pipelineRun.getChildren();
      expect(children).to.have.lengthOf(2);
      expect(children[0].label).eq('then-check');
      expect(children[1].label).eq('first-create-file');
    });

    test('TaskRun should contains condition run node', () => {
      const json = require(path.join('..', '..', 'test', 'pipelinerun.json')) as PipelineRunData;
      const pipelineRun = new PipelineRun(pipelineItem, json.metadata.name, undefined, json, TreeItemCollapsibleState.Expanded);

      expect(pipelineRun.label).equal('condtional-pr');
      const children = pipelineRun.getChildren() as TektonNodeImpl[];
      expect(children).to.have.lengthOf(2);
      expect(children[0].label).eq('then-check');

      const conditionRun = children[0].getChildren() as TektonNodeImpl[];
      expect(conditionRun).not.undefined;
      expect(conditionRun).to.have.lengthOf(1);
      expect(conditionRun[0].name).eq('condtional-pr-then-check-mr5dp-file-exists-bhxgl');
    });
  });
});
