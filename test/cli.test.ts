/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { createCliCommand, cliCommandToString, cli } from '../src/cli';
import * as childProcess from 'child_process';
import * as events from 'events';
import * as stream from 'stream';

const expect = chai.expect;
chai.use(sinonChai);

suite('Cli', () => {
  const sandbox = sinon.createSandbox();
  let spawnStub: sinon.SinonStub;
  let procMock: childProcess.ChildProcess;
  const command = createCliCommand('command');
  const options: childProcess.SpawnOptions = { cwd: 'cwd', shell: true, windowsHide: true };
  const stdout = 'Standard output';
  const stderr = 'Error output';
  const error: childProcess.ExecException = {
    message: 'Fatal Error',
    name: 'name'
  };

  setup(() => {
    procMock = new events.EventEmitter() as childProcess.ChildProcess;
    procMock.stdin = new stream.Writable();
    procMock.stdout = new events.EventEmitter() as stream.Readable;
    procMock.stderr = new events.EventEmitter() as stream.Readable;
    spawnStub = sandbox.stub(childProcess, 'spawn').returns(procMock);
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
    expect(result).deep.equals({ error: undefined, stdout: stdout });
  });

  test('execute passes errors into its exit data', async () => {
    const p = cli.execute(command);
    procMock.stdout.emit('data', stdout);
    procMock.stderr.emit('data', stderr);
    procMock.emit('error', error);
    procMock.emit('close', 1);
    const result = await p;

    expect(result).deep.equals({ error: error, stdout: stdout });
  });

  test('cli command to string function', () => {
    expect(cliCommandToString(createCliCommand('foo', 'bar', '-foo=bar', 'g'))).equals('foo bar -foo=bar g');
  });

  test('cli command to string with undefined args', () => {
    expect(cliCommandToString(createCliCommand('foo'))).equals('foo ');
  });
});
