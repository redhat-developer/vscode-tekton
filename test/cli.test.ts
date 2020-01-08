/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { Cli, createCliCommand, cliCommandToString } from '../src/cli';
import * as child_process from 'child_process';
import * as events from 'events';
import * as stream from 'stream';

const expect = chai.expect;
chai.use(sinonChai);

suite('Cli', () => {
    let sandbox: sinon.SinonSandbox;
    let spawnStub: sinon.SinonStub;
    let procMock: child_process.ChildProcess;
    const cli = Cli.getInstance();
    const command = createCliCommand('command');
    const options: child_process.SpawnOptions = { cwd: 'cwd', shell: true, windowsHide: true };
    const stdout = 'Standard output';
    const stderr = 'Error output';
    const error: child_process.ExecException = {
        message: 'Fatal Error',
        name: 'name'
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        procMock = <child_process.ChildProcess>new events.EventEmitter();
        procMock.stdin = new stream.Writable();
        procMock.stdout = <stream.Readable>new events.EventEmitter();
        procMock.stderr = <stream.Readable>new events.EventEmitter();
        spawnStub = sandbox.stub(child_process, 'spawn').returns(procMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('execute runs the given command from shell', async () => {
        const p = cli.execute(command, options);
        procMock.stdout.emit('data', stdout);

        procMock.emit('close', 0);

        const result = await p;

        expect(spawnStub).calledWith(command.cliCommand, command.cliArguments, options);
        expect(result).deep.equals({ error: undefined, stdout: stdout, stderr: '' });
    });

    test('execute passes errors into its exit data', async () => {
        const p = cli.execute(command);
        procMock.stdout.emit('data', stdout);
        procMock.stderr.emit('data', stderr);
        procMock.emit('error', error);
        procMock.emit('close', 1);
        const result = await p;

        expect(result).deep.equals({ error: error, stdout: stdout, stderr: stderr });
    });

    test('cli command to string function', () => {
        expect(cliCommandToString(createCliCommand('foo', 'bar', '-foo=bar', 'g'))).equals('foo bar -foo=bar g');
    });

    test('cli command to string with undefined args', () => {
        expect(cliCommandToString(createCliCommand('foo'))).equals('foo ');
    });
});
