/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { PipelineResource } from '../../src/tekton/pipelineresource';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';
import { window } from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineResource', () => {
    let sandbox: sinon.SinonSandbox;
    const errorMessage = 'FATAL ERROR';
    let execStub: sinon.SinonStub;
    let warnStub: sinon.SinonStub<[string, import("vscode").MessageOptions, ...import("vscode").MessageItem[]], Thenable<import("vscode").MessageItem>>;
    let getPipelineNamesStub: sinon.SinonStub;
    const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
    const pipelineresourceItem = new TestItem(pipelineItem, 'pipelineresource', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");

    const sampleYaml = `
    # manifests.yaml
    apiVersion: tekton.dev/v1alpha1
    kind: PipelineResource
    metadata:
        name: api-repo
    spec:
        type: git
    params: 
        - name: url
          value: http://github.com/openshift-pipelines/vote-api.git
    `;

    const TextEditorMock = {
        document: {
            fileName: "manifests.yaml",
            getText: sinon.stub().returns(sampleYaml),
        },
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineresourceItem]);
        getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(window, 'showInputBox');
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('create', async () => {

        setup(async () => {
            warnStub = sandbox.stub(window, 'showWarningMessage');
        });


        test('show warning message if file is not yaml', async () => {
            await PipelineResource.create();
            expect(warnStub).is.calledOnce;
        });
    
        test('Save the file if user click on Save button', async () => {
            execStub.resolves({
                error: undefined,
                stderr: '',
                stdout: "text"
            });
            sandbox.stub(window, 'showInformationMessage').resolves('Save');
            sandbox.stub(window, "activeTextEditor").value({
                document: {
                    fileName: "manifests.yaml",
                    isDirty: true,
                    save: sinon.stub().returns(true)
                },
            });
            const result = await PipelineResource.create();
            expect(result).equals('PipelineResources were successfully created.');
        });
    
        test('show warning message if file content is changed', async () => {
            const infoMsg = sandbox.stub(window, 'showInformationMessage').resolves(undefined);
            sandbox.stub(window, "activeTextEditor").value({
                document: {
                    fileName: "manifests.yaml",
                    isDirty: true,
                },
            });
            await PipelineResource.create();
            expect(warnStub).is.calledOnce;
            expect(infoMsg).is.calledOnce;
        });
    
        test('Creates an tekton PipelineResources using .yaml file location from an active editor', async () => {
            execStub.resolves({
                error: undefined,
                stderr: '',
                stdout: "text"
            });
            sandbox.stub(window, "activeTextEditor").value(TextEditorMock);
            const result = await PipelineResource.create();
            expect(result).equals('PipelineResources were successfully created.');
        });
    
        test('errors when fail too create resource', async () => {
            let savedErr: any;
            execStub.rejects(errorMessage);
            sandbox.stub(window, "activeTextEditor").value(TextEditorMock);
            try {
                await PipelineResource.create();
            } catch (err) {
                savedErr = err;
            }
            expect(savedErr).equals(`Failed to Create PipelineResources with error: ${errorMessage}`);
        });
    });

    suite('list command', async () => {
        let termStub: sinon.SinonStub;

        setup(() => {
            termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
        });

        suite('called from \'Tekton Pipelines Explorer\'', () => {

            test('executes the list tkn command in terminal', async () => {
                await PipelineResource.list(pipelineresourceItem);
                expect(termStub).calledOnceWith(Command.listPipelineResourcesInTerminal(pipelineresourceItem.getName()));
            });

        });

        suite('called from command palette', () => {

            test('calls the appropriate error message when no pipelineresource found', async () => {
                getPipelineNamesStub.restore();
                sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([]);
                try {
                    await PipelineResource.list(null);
                } catch (err) {
                    expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                    return;
                }
            });
        });

        suite('called from command bar', () => {

            test('returns null when clustertask is not defined properly', async () => {
                const result = await PipelineResource.list(null);
                // tslint:disable-next-line: no-unused-expression
                expect(result).undefined;
            });

            test('skips tkn command execution if canceled by user', async () => {
                await PipelineResource.describe(null);
                // tslint:disable-next-line: no-unused-expression
                expect(termStub).not.called;
            });
        });

        suite('describe', () => {

            test('returns null when cancelled', async () => {
                const result = await PipelineResource.describe(null);

                expect(result).undefined;
            });

            test('describe calls the correct tkn command in terminal', async () => {
                await PipelineResource.describe(pipelineresourceItem);
                expect(termStub).calledOnceWith(Command.describePipelineResource(pipelineresourceItem.getName()));
            });

        });

        suite('delete command', () => {
            let warnStub: sinon.SinonStub;

            setup(() => {
                warnStub = sandbox.stub(window, 'showWarningMessage');
            });

            test('calls the appropriate tkn command if confirmed', async () => {
                warnStub.resolves('Yes');

                await PipelineResource.delete(pipelineresourceItem);

                expect(execStub).calledOnceWith(Command.deletePipelineResource(pipelineresourceItem.getName()));
            });

            test('returns a confirmation message text when successful', async () => {
                warnStub.resolves('Yes');

                const result = await PipelineResource.delete(pipelineresourceItem);

                expect(result).equals(`The Resource '${pipelineresourceItem.getName()}' successfully deleted.`);
            });

            test('returns null when cancelled', async () => {
                warnStub.resolves('Cancel');

                const result = await PipelineResource.delete(pipelineresourceItem);

                expect(result).null;
            });

            test('throws an error message when command failed', async () => {
                warnStub.resolves('Yes');
                execStub.rejects('ERROR');
                let expectedError: any;
                try {
                    await PipelineResource.delete(pipelineresourceItem);
                } catch (err) {
                    expectedError = err;
                }
                expect(expectedError).equals(`Failed to delete the Resource '${pipelineresourceItem.getName()}': 'ERROR'.`);
            });
        });

    });
});
