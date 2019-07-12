/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { PipelineRun } from '../src/tekton/pipelinerun';
import { TaskRun } from '../src/tekton/taskrun';
import { Pipeline } from '../src/tekton/pipeline';
import { Task } from '../src/tekton/task';
import packagejson = require('../package.json');

const expect = chai.expect;
chai.use(sinonChai);

suite('tekton connector Extension', async () => {

    let sandbox: sinon.SinonSandbox;

    setup(async () => {
        sandbox = sinon.createSandbox();
        const stub = sandbox.stub(Pipeline, 'about');
        await vscode.commands.executeCommand('tekton.about');
        stub.restore();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('redhat-developers.vscode-tekton'));
	});

    async function getStaticMethodsToStub(tekton: string[]): Promise<string[]> {
        const mths: Set<string> = new Set();
        tekton.forEach((name) => {
            name.replace('.palette', '');
            const segs: string[] = name.split('.');
            let methName: string = segs[segs.length-1];
            methName = methName === 'delete'? 'del' : methName;
            !mths.has(methName) && mths.add(methName);

        });
        return [...mths];
    }

    test('should activate extension', async () => {
        sandbox.stub(vscode.window, 'showErrorMessage');
        const cmds: string[] = await vscode.commands.getCommands();
        const tekton: string[] = cmds.filter((item) => item.includes('tekton.'));
        const mths: string[] = await getStaticMethodsToStub(tekton);
        (<any>[PipelineRun,  TaskRun, Pipeline, Task, ]).forEach(async (item) => {
            mths.forEach((name) => {
                if (item[name]) {
                    sandbox.stub(item, name).resolves();
                }
            });
        });
        tekton.forEach((item) => vscode.commands.executeCommand(item));
        expect(vscode.window.showErrorMessage).has.not.been.called;
    });

    test('should register all extension commands declared commands in package descriptor', async () => {
        return await vscode.commands.getCommands(true).then((commands) => {
            packagejson.contributes.commands.forEach((value)=> {
                expect(commands.indexOf(value.command) > -1, `Command '${value.command}' handler is not registered during activation`).true;
            });
        });
    });

   test('sync command wrapper shows message returned from command', async () => {
        sandbox.stub( 'about');
        sandbox.stub(vscode.window, 'showErrorMessage');
        const simStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('tekton.about');
        expect(simStub).not.called;
    });

    test('sync command wrapper shows message returned from command', async () => {
        const error = new Error('Message');
        sandbox.stub(Pipeline,'refresh').throws(error);
        const semStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('tekton.explorer.refresh');
        expect(semStub).calledWith(error);
    });
});
