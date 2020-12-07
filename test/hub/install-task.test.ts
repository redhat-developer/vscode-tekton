/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { tkn, Command } from '../../src/tkn';
import { installTask } from '../../src/hub/install-task';
import { DownloadUtil } from '../../src/util/download';
import * as os from 'os';
import * as fs from 'fs-extra'; 
import * as path from 'path';

const expect = chai.expect;
chai.use(sinonChai);

suite('Install Task', () => {
  const sandbox = sinon.createSandbox();
  let showWarningMessageStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let getRawTasksStub: sinon.SinonStub;
  let getRawClusterTasksStub: sinon.SinonStub;
  let executeStub: sinon.SinonStub;
  let downloadStub: sinon.SinonStub;
  let tmpdirStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  
  setup(() => {
    showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');
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
    await installTask({
      name: 'foo',
      url: 'https://some/path/task.yaml',
      asClusterTask: false
    });

    expect(executeStub).calledOnceWith(Command.updateYaml('https://some/path/task.yaml'));
    expect(showInformationMessageStub).calledOnceWith('Task foo installed.');
  });

  test('install ClusterTask', async () => {
    getRawClusterTasksStub.resolves([]);
    downloadStub.resolves();
    executeStub.resolves({});
    tmpdirStub.returns('/foo');
    unlinkStub.resolves();
    await installTask({
      name: 'foo',
      url: 'https://some/path/task.yaml',
      asClusterTask: true
    });
    const tempPath = path.join('/foo','task.yaml');
    expect(downloadStub).calledOnceWith('https://some/path/task.yaml', tempPath);
    expect(executeStub).calledOnceWith(Command.updateYaml(tempPath));
    expect(unlinkStub).calledOnceWith(tempPath);
    expect(showInformationMessageStub).calledOnceWith('ClusterTask foo installed.');
  });
});
