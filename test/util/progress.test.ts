/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { Progress } from '../../src/util/progress';
import * as vscode from 'vscode';
import { TknImpl } from '../../src/tkn';
import { createCliCommand } from '../../src/cli';

const expect = chai.expect;
chai.use(sinonChai);

suite('Progress Utility', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    const options = {
        cancellable: false,
        location: vscode.ProgressLocation.Notification,
        title: `Testing Progress`
    };
    const command1 = { command: createCliCommand('command', 'one'), increment: 50 };
    const command2 = { command: createCliCommand('command', 'two'), increment: 50 };
    const steps = [command1, command2];
    const errorMessage = 'An error';

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('calls cli commands in sequence', async () => {
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: undefined, stdout: "", stderr: "" });
        await Progress.execWithProgress(options, steps, TknImpl.Instance);

        // tslint:disable-next-line: no-unused-expression
        expect(execStub).calledTwice;
        expect(execStub.getCall(0).args[0]).equals(command1.command);
        expect(execStub.getCall(1).args[0]).equals(command2.command);
        sandbox.restore();
    });

    test('calls progress with given options', async () => {
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: undefined, stdout: "", stderr: "" });
        const spy = sandbox.spy(vscode.window, 'withProgress');
        await Progress.execWithProgress(options, steps, TknImpl.Instance);

        expect(spy).calledOnceWith(options, sinon.match.func);
        sandbox.restore();
    });

    test('throw an error if a command fails', async () => {
        const error = new Error(errorMessage);
        execStub = sandbox.stub(TknImpl.prototype, 'execute').rejects(error);
        let e;
        try {
            await Progress.execWithProgress(options, steps, TknImpl.Instance);
        } catch (err) {
            e = err;
            expect(err.message).equals(errorMessage);
        }
        if (!e) {
            expect.fail('no error thrown');
        }
        sandbox.restore();
    });

    test('execCmdWithProgress returned promise resolves in case of cmd finished successfully', () => {
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: undefined, stdout: '', stderr: '' });
        Progress.execCmdWithProgress('title', createCliCommand('cmd')).catch(() => {
            expect.fail(true, false, 'returned promise should not be rejected');
        });
        sandbox.restore();
    });

    test('execCmdWithProgress returned promise rejects in case of cmd finished with failure', async () => {
        const error = new Error(errorMessage);
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error, stdout: '', stderr: '' });
        let e;
        try {
            await Progress.execCmdWithProgress('title', createCliCommand('cmd'));
        } catch (err) {
            e = err;
            expect(err.message).equals(errorMessage);
        }
        if (!e) {
            expect.fail('no error thrown');
        }
        sandbox.restore();
    });
});
