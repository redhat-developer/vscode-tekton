/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as taskProvider from '../../src/yaml-support/tkn-tasks-provider';
import * as tkn from '../../src/tkn';

const expect = chai.expect;
chai.use(sinonChai);

suite('Task provider', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    const tknCli: tkn.Tkn = tkn.TknImpl.Instance;

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(tknCli, 'execute');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should receive tasks from tkn', async () => {
        execStub.resolves();

        execStub.onCall(0).resolves({
            error: null, stderr: '', stdout: JSON.stringify({
                "items": [{
                    "kind": "ClusterTask",
                    "apiVersion": "tekton.dev/v1alpha1",
                    "metadata": {
                        "name": "clustertask1"
                    },
                    "spec": {

                    }
                }]
            })
        });

        execStub.onCall(1).resolves({
            error: null, stderr: '', stdout: JSON.stringify({
                "items": [{
                    "kind": "Task",
                    "apiVersion": "tekton.dev/v1alpha1",
                    "metadata": {
                        "name": "clustertask2"
                    },
                    "spec": {

                    }
                }]
            })
        });

        const snippets = await taskProvider.getTknTasksSnippets();

        expect(snippets.length).to.equal(2);

    });


    test('convertTasksToSnippet should return snippets', () => {
        const result = taskProvider.convertTasksToSnippet([{
            "kind": "Task",
            metadata: {
                name: "CustomTask"
            },
            spec: {
                steps: [],
                inputs: {},
                outputs: {}
            }
        }]);

        expect(result).to.eql([{ label: 'CustomTask', description: 'Task', body: { name: '$1', taskRef: { name: 'CustomTask' } } }]);
    });

    test('convertTasksToSnippet should convert inputs ', () => {
        const result = taskProvider.convertTasksToSnippet([{
            "kind": "Task",
            metadata: {
                name: "CustomTask"
            },
            spec: {
                steps: [],
                inputs: {
                    params: [{ name: 'fooParam' }],
                    resources: [{ name: 'barResource', type: 'barType' }]
                },
                outputs: {}
            }
        }]);

        expect(result).to.eql([{
            label: 'CustomTask',
            description: 'Task',
            body: { name: '$1', taskRef: { name: 'CustomTask' }, params: [{ name: 'fooParam', value: '$2' }], resources: { inputs: [{ name: 'barResource', resource: "$3" }] } }
        }]);
    });

    test('convertTasksToSnippet should add params with default values', () => {
        const result = taskProvider.convertTasksToSnippet([{
            "kind": "Task",
            metadata: {
                name: "CustomTask"
            },
            spec: {
                steps: [],
                inputs: {
                    params: [{ name: 'fooParam', default: 'fooDefault' }],
                    resources: [{ name: 'barResource', type: 'barType' }]
                },
                outputs: {}
            }
        }]);

        expect(result).to.eql([{
            label: 'CustomTask',
            description: 'Task',
            body: { name: '$1', taskRef: { name: 'CustomTask' }, params: [{ name: 'fooParam', value: 'fooDefault' }], resources: { inputs: [{ name: 'barResource', resource: "$2" }] } }
        }]);
    });

    test('convertTasksToSnippet should add output', () => {
        const result = taskProvider.convertTasksToSnippet([{
            "kind": "Task",
            metadata: {
                name: "CustomTask"
            },
            spec: {
                steps: [],
                inputs: {},
                outputs: {
                    resources: [{ name: 'Foo', type: 'Bar' }],
                }
            }
        }]);

        expect(result).to.eql([{
            label: 'CustomTask',
            description: 'Task',
            body: { name: '$1', taskRef: { name: 'CustomTask' }, resources: { outputs: [{ name: 'Foo', resource: "$2" }] } }
        }]);
    });
});
