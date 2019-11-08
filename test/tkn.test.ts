/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as tkn from '../src/tkn';
import { CliExitData, Cli } from '../src/cli';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { ToolsConfig } from '../src/tools';
import { WindowUtil } from '../src/util/windowUtils';
import { Pipeline, StartPipelineObject, PipeResources, PipeParams, PipelineTrigger, NameType } from '../src/tekton/pipeline';
import { window, Terminal } from 'vscode';
import jsYaml = require('js-yaml');
import { TestItem } from './tekton/testTektonitem';
import { ExecException } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const expect = chai.expect;
chai.use(sinonChai);

// This needs to be edited to actually make sense wrt Tasks/TaskRuns in particular and nesting of resources
suite("tkn", () => {
    const tknCli: tkn.Tkn = tkn.TknImpl.Instance;
    let pipeTrigger: PipelineTrigger[];
    let startPipelineObj: StartPipelineObject;
    let sandbox: sinon.SinonSandbox;
    const errorMessage = 'Error';

    setup(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(ToolsConfig, 'getVersion').resolves('0.2.0');
        tknCli.clearCache();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('command execution', () => {
        let execStub: sinon.SinonStub, toolsStub: sinon.SinonStub;
        const command = 'tkn do whatever you do';

        setup(() => {
            execStub = sandbox.stub(Cli.prototype, 'execute');
            toolsStub = sandbox.stub(ToolsConfig, 'detectOrDownload').resolves();
        });

        test('execute calls the given command in shell', async () => {
            const data = { stdout: 'done', stderr: '', error: null };
            execStub.resolves(data);
            const result = await tknCli.execute(command);

            expect(execStub).calledOnceWith(command);
            expect(result).deep.equals(data);
        });

        test('execute calls command with its detected location', async () => {
            const toolPath = 'path/to/tool/tool';
            execStub.resolves({ stdout: 'done', stderr: '', error: null });
            toolsStub.resolves(toolPath);
            await tknCli.execute(command);

            expect(execStub).calledOnceWith(command.replace('tkn', `"${toolPath}"`));
        });

        test('execute allows to set its working directory', async () => {
            execStub.resolves({ stdout: 'done', stderr: '', error: null });
            const cwd = 'path/to/some/dir';
            await tknCli.execute(command, cwd);

            expect(execStub).calledOnceWith(command, { cwd: cwd });
        });

        test('execute rejects if an error occurs in the shell command', async () => {
            const err: ExecException = { message: 'ERROR', name: 'err' };
            execStub.resolves({ error: err, stdout: '', stderr: '' });
            try {
                await tknCli.execute(command);
                expect.fail();
            } catch (error) {
                expect(error).equals(err);
            }
        });

        test('execute can be set to pass errors through exit data', async () => {
            const err: ExecException = { message: 'ERROR', name: 'err' };
            execStub.resolves({ error: err, stdout: '', stderr: '' });
            const result = await tknCli.execute(command, null, false);

            expect(result).deep.equals({ error: err, stdout: '', stderr: '' });
        });

        test('executeInTerminal send command to terminal and shows it', async () => {
            const termFake: Terminal = {
                name: "name",
                processId: Promise.resolve(1),
                sendText: sinon.stub(),
                show: sinon.stub(),
                hide: sinon.stub(),
                dispose: sinon.stub()
            };
            toolsStub.restore();
            toolsStub = sandbox.stub(ToolsConfig, 'detectOrDownload').resolves(path.join('segment1', 'segment2'));
            const ctStub = sandbox.stub(WindowUtil, 'createTerminal').returns(termFake);
            await tknCli.executeInTerminal('tkn');
            // tslint:disable-next-line: no-unused-expression
            expect(termFake.show).calledOnce;
            expect(ctStub).calledWith('Tekton', process.cwd(), 'segment1');
        });
    });

    suite('item listings', () => {
        let execStub: sinon.SinonStub, yamlStub: sinon.SinonStub;
        let getPipelines: sinon.SinonStub;
        const pipelineNodeItem = new TestItem(tkn.TknImpl.ROOT, 'pipelinenode', tkn.ContextType.PIPELINENODE);
        const pipelineItem1 = new TestItem(pipelineNodeItem, 'pipeline1', tkn.ContextType.PIPELINE);
        const pipelineItem2 = new TestItem(pipelineNodeItem, 'pipeline2', tkn.ContextType.PIPELINE);
        const pipelineItem3 = new TestItem(pipelineNodeItem, 'pipeline3', tkn.ContextType.PIPELINE);
        const pipelinerunItem = new TestItem(pipelineItem1, 'pipelinerun1', tkn.ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");
        const taskrunItem = new TestItem(pipelinerunItem, 'taskrun1', tkn.ContextType.TASKRUN, undefined, "2019-07-25T12:03:01Z", "True");
        const taskrunItem2 = new TestItem(pipelinerunItem, 'taskrun2', tkn.ContextType.TASKRUN, undefined, "2019-07-25T12:03:02Z", "True");
        const taskNodeItem = new TestItem(tkn.TknImpl.ROOT, 'tasknode', tkn.ContextType.TASKNODE);
        const taskItem = new TestItem(taskNodeItem, 'task1', tkn.ContextType.TASK);
        const taskItem2 = new TestItem(taskNodeItem, 'task2', tkn.ContextType.TASK);
        const clustertaskNodeItem = new TestItem(tkn.TknImpl.ROOT, 'clustertasknode', tkn.ContextType.CLUSTERTASKNODE);
        const clustertaskItem = new TestItem(clustertaskNodeItem, 'clustertask1', tkn.ContextType.CLUSTERTASK);

        setup(() => {
            execStub = sandbox.stub(tknCli, 'execute');
            yamlStub = sandbox.stub(jsYaml, 'safeLoad');
        });

        test('startPipeline returns items from tkn pipeline start command', async () => {

            let testResources: PipeResources[] = [
                {
                    name: "test-resource1",
                    resourceRef: "resource1"
                },
                {
                    name: "test-resource2",
                    resourceRef: "resource1"
                }
            ];
            let testParams: PipeParams[] = [
                {
                    default: "package",
                    description: "Param test description",
                    name: "test-param1"
                },
                {
                    default: "package",
                    description: "Param test description",
                    name: "test-param2"
                }
            ];

            startPipelineObj = {
                name: "pipeline",
                resources: testResources,
                params: testParams,
                serviceAccount: undefined
            };
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [{
                        "kind": "Pipeline",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "pipeline"
                        }
                    }]
                })
            });
            const result = await tknCli.startPipeline(startPipelineObj);

            expect(execStub).calledOnceWith(tkn.Command.startPipeline(startPipelineObj));
            expect(result.length).equals(1);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].getName()).equals(startPipelineObj.name);
            }

        });

        test('getPipelines returns items from tkn pipeline list command', async () => {
            const tknPipelines = ['pipeline1', 'pipeline2', 'pipeline3'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [{
                        "kind": "Pipeline",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "pipeline1"
                        }
                    }, {
                        "kind": "Pipeline",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "pipeline2"
                        }
                    }, {
                        "kind": "Pipeline",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "pipeline3"
                        }
                    }]
                })
            });
            const result = await tknCli.getPipelines(pipelineNodeItem);

            expect(execStub).calledOnceWith(tkn.Command.listPipelines());
            expect(result.length).equals(3);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].getName()).equals(tknPipelines[i]);
            }
        });

        test('getPipelines returns empty list if tkn produces no output', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getPipelines").resolves([]);
            execStub.resolves({ stdout: '', stderr: '', error: null });
            const result = await tknCli.getPipelines(pipelineNodeItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });

        test('getTasks returns items from tkn task list command', async () => {
            const tknTasks = ['task1', 'task2'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [{
                        "kind": "Task",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "task1"
                        }
                    }, {
                        "kind": "Task",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "task2"
                        }
                    }]
                })
            });
            const result = await tknCli.getTasks(taskNodeItem);

            expect(execStub).calledOnceWith(tkn.Command.listTasks());
            expect(result.length).equals(2);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].getName()).equals(tknTasks[i]);
            }
        });

        test('getTasks returns empty list if tkn produces no output', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getTasks").resolves([]);
            execStub.resolves({ stdout: '', stderr: '', error: null });
            const result = await tknCli.getTasks(taskNodeItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });

        test('getClusterTasks returns items from tkn task list command', async () => {
            const tknTasks = ['clustertask1', 'clustertask2'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [{
                        "kind": "ClusterTask",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "clustertask1"
                        }
                    }, {
                        "kind": "Task",
                        "apiVersion": "tekton.dev/v1alpha1",
                        "metadata": {
                            "name": "clustertask2"
                        }
                    }]
                })
            });
            const result = await tknCli.getClusterTasks(clustertaskNodeItem);

            expect(execStub).calledOnceWith(tkn.Command.listClusterTasks());
            expect(result.length).equals(2);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].getName()).equals(tknTasks[i]);
            }
        });

        test('getClusterTasks returns empty list if tkn produces no output', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getClusterTasks").resolves([]);
            execStub.resolves({ stdout: '', stderr: '', error: null });
            const result = await tknCli.getTasks(clustertaskNodeItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });


        test('getPipelineRuns returns pipelineruns for a pipeline', async () => {
            const tknPipelineRuns = ['pipelinerun1'];
            execStub.resolves({
                error: null, stderr: '',
                stdout: JSON.stringify({
                    items: [
                        {
                            "kind": "PipelineRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "pipelinerun1"
                            },
                            "spec": {
                                "pipelineRef": {
                                    "name": "pipeline1"
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                                "taskRuns": {
                                    "pipelinerun1-test-taskrun1-a1bcd": {
                                        "pipelineTaskName": "taskrun1",
                                        "status": {
                                            "conditions": [{
                                                "status": "True"
                                            }],
                                            "startTime": "2019-07-25T12:03:01Z"
                                        }
                                    },
                                    "pipelinerun1-test-taskrun2-a1bcd": {
                                        "pipelineTaskName": "taskrun2",
                                        "status": {
                                            "conditions": [{
                                                "status": "True"
                                            }],

                                            "startTime": "2019-07-25T12:03:02Z"
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
            sandbox.stub(tkn.TknImpl.prototype, "getPipelineRuns").resolves([]);
            execStub.returns({
                error: undefined,
                stdout: JSON.stringify({
                    items: []
                }
                ),
                stderr: ''
            });
            const result = await tknCli.getPipelineRuns(pipelineNodeItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });

        test('getTaskRun returns taskrun list for a pipelinerun', async () => {
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "ownerReferences": [{
                                    "kind": "PipelineRun",
                                    "name": "pipelinerun1"
                                }],
                                "labels": {
                                    "tekton.dev/pipelineRun": "pipelinerun1"
                                }
                                
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "ownerReferences": [{
                                    "kind": "PipelineRun",
                                    "name": "pipelinerun1"
                                }],
                                "labels": {
                                    "tekton.dev/pipelineRun": "pipelinerun1"
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRuns(pipelinerunItem);

            expect(result.length).equals(2);
            expect(result[0].getName()).equals('taskrun2');
        });

        test('getTaskruns returns taskruns for a pipelinerun', async () => {
            const tknTaskRuns = ['taskrun2', 'taskrun1'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "ownerReferences": [{
                                    "kind": "PipelineRun",
                                    "name": "pipelinerun1"
                                }],
                                "labels": {
                                    "tekton.dev/pipelineRun": "pipelinerun1"
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "ownerReferences": [{
                                    "kind": "PipelineRun",
                                    "name": "pipelinerun1"
                                }],
                                "labels": {
                                    "tekton.dev/pipelineRun": "pipelinerun1"
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRuns(pipelinerunItem);
            expect(execStub).calledWith(tkn.Command.listTaskRuns());
            expect(result.length).equals(2);
            for (let i = 0; i < result.length; i++) {
                expect(result[i].getName()).equals(tknTaskRuns[i]);
            }
        });

        test('getTaskruns returns an empty list if an error occurs', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getTaskRuns").resolves([]);
            execStub.onFirstCall().resolves({ error: undefined, stdout: '', stderr: '' });
            execStub.onSecondCall().rejects(errorMessage);
            const result = await tknCli.getTaskRuns(pipelinerunItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });

        test('getTaskRunFromTasks returns taskrun list for a task', async () => {
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "labels": {
                                    "tekton.dev/pipelineTask": "task1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "task1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "labels": {
                                    "tekton.dev/pipelineTask": "task1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "task1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRunsforTasks(taskItem);

            expect(result.length).equals(2);
            expect(result[0].getName()).equals('taskrun2');
        });

        test('getTaskrunsFromTasks returns taskruns for a task', async () => {
            const tknTaskRuns = ['taskrun2', 'taskrun1'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "labels": {
                                    "tekton.dev/pipelineTask": "task1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "task1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "labels": {
                                    "tekton.dev/pipelineTask": "task1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "task1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRunsforTasks(taskItem);
            expect(execStub).calledWith(tkn.Command.listTaskRunsforTasks(taskItem.getName()));
            expect(result.length).equals(2);
            for (let i = 0; i < result.length; i++) {
                expect(result[i].getName()).equals(tknTaskRuns[i]);
            }
        });

        test('getTaskrunsFromTasks returns an empty list if an error occurs', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getTaskRunsforTasks").resolves([]);
            execStub.onFirstCall().resolves({ error: undefined, stdout: '', stderr: '' });
            execStub.onSecondCall().rejects(errorMessage);
            const result = await tknCli.getTaskRunsforTasks(taskItem);

            // tslint:disable-next-line: no-unused-expression
            expect(result).empty;
        });

        test('getTaskRunFromTasks returns taskrun list for a clustertask', async () => {
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "labels": {
                                    "tekton.dev/pipelineTask": "clustertask1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "clustertask1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "labels": {
                                    "tekton.dev/pipelineTask": "clustertask1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "clustertask1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRunsforTasks(clustertaskItem);

            expect(result.length).equals(2);
            expect(result[0].getName()).equals('taskrun2');
        });

        test('getTaskrunsFromTasks returns taskruns for a clustertask', async () => {
            const tknTaskRuns = ['taskrun2', 'taskrun1'];
            execStub.resolves({
                error: null, stderr: '', stdout: JSON.stringify({
                    "items": [
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun1",
                                "labels": {
                                    "tekton.dev/pipelineTask": "clustertask1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "clustertask1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:00Z",
                            }
                        },
                        {
                            "kind": "TaskRun",
                            "apiVersion": "tekton.dev/v1alpha1",
                            "metadata": {
                                "name": "taskrun2",
                                "labels": {
                                    "tekton.dev/pipelineTask": "clustertask1"
                                }
                            },
                            "spec": {
                                "taskRef": {
                                    "name": "clustertask1",
                                }
                            },
                            "status": {
                                "conditions": [
                                    {
                                        "status": "True",
                                    }
                                ],
                                "startTime": "2019-07-25T12:03:01Z",
                            }
                        }]
                })
            });
            const result = await tknCli.getTaskRunsforTasks(clustertaskItem);
            expect(execStub).calledWith(tkn.Command.listTaskRunsforTasks(clustertaskItem.getName()));
            expect(result.length).equals(2);
            for (let i = 0; i < result.length; i++) {
                expect(result[i].getName()).equals(tknTaskRuns[i]);
            }
        });

        test('getPipelineRunChildren returns taskruns for an pipelinerun', async () => {
            sandbox.stub(tkn.TknImpl.prototype, "getTaskRuns").resolves([taskrunItem]);
            execStub.onFirstCall().resolves({
                error: undefined, stdout: JSON.stringify({
                    items: [
                        {
                            metadata: {
                                name: 'taskrun1',
                            },
                            spec: {
                                pipelineRef: {
                                    name: 'pipeline1',
                                }
                            }

                        }
                    ]
                }), stderr: ''
            });
            execStub.onSecondCall().resolves({ error: undefined, stdout: 'serv', stderr: '' });
            //TODO: Probably need a get children here
            const result = await tknCli.getTaskRuns(pipelinerunItem);

            expect(result[0].getName()).deep.equals('taskrun1');
        });
    });
});