/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { tkn } from '../../src/tkn';
import { installResource } from '../../src/hub/install-resource';
import { DownloadUtil } from '../../src/util/download';
import * as os from 'os';
import * as fs from 'fs-extra'; 
import * as path from 'path';
import { ResourceVersionData } from '../../src/tekton-hub-client';
import { Command } from '../../src/cli-command';

const expect = chai.expect;
chai.use(sinonChai);

suite('Install Task', () => {
  const sandbox = sinon.createSandbox();
  let showInformationMessageStub: sinon.SinonStub;
  let getRawTasksStub: sinon.SinonStub;
  let getRawClusterTasksStub: sinon.SinonStub;
  let executeStub: sinon.SinonStub;
  let downloadStub: sinon.SinonStub;
  let tmpdirStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  
  setup(() => {
    showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
    getRawTasksStub = sandbox.stub(tkn, 'getRawTasks');
    getRawClusterTasksStub = sandbox.stub(tkn, 'getRawClusterTasks');
    executeStub = sandbox.stub(tkn, 'execute');
    downloadStub = sandbox.stub(DownloadUtil, 'downloadFile');
    tmpdirStub = sandbox.stub(os, 'tmpdir');
    unlinkStub = sandbox.stub(fs, 'unlink');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('install Task', async () => {
    getRawTasksStub.resolves([]);
    executeStub.resolves({});
    await installResource({
      name: 'foo',
      url: 'https://some/path/task.yaml',
      kind: 'Task',
      asClusterTask: false,
      resourceVersion: {version: '1.0'} as ResourceVersionData,
      view: 'test'
    });

    expect(executeStub).calledOnceWith(Command.hubInstallTask('foo', '1.0'));
    expect(showInformationMessageStub).calledOnceWith('Task foo installed.');
  });

  test('install ClusterTask', async () => {
    getRawClusterTasksStub.resolves([]);
    downloadStub.resolves();
    executeStub.resolves({});
    tmpdirStub.returns('/foo');
    unlinkStub.resolves();
    await installResource({
      name: 'foo',
      kind: 'Task',
      url: 'https://some/path/task.yaml',
      asClusterTask: true,
      view: 'test'
    });
    const tempPath = path.join('/foo','task.yaml');
    expect(downloadStub).calledOnceWith('https://some/path/task.yaml', tempPath);
    expect(executeStub).calledOnceWith(Command.apply(tempPath));
    expect(unlinkStub).calledOnceWith(tempPath);
    expect(showInformationMessageStub).calledOnceWith('ClusterTask foo installed.');
  });
});
