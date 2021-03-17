/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, ContextType } from '../../src/tkn';
import { PipelineRun } from '../../src/tekton/pipelinerun';
import { TestItem } from './testTektonitem';
import { errorMessage, TektonItem } from '../../src/tekton/tektonitem';
import * as logInEditor from '../../src/util/log-in-editor';
import { Command } from '../../src/util/command';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineRun', () => {
  const sandbox = sinon.createSandbox();
  let getPipelineNamesStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineRunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');
  let showLogInEditorStub: sinon.SinonStub;
  let configurationStub: sinon.SinonStub;

  setup(() => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelineRunItem]);
    sandbox.stub(TknImpl.prototype, 'getPipelineRunsList').resolves([pipelineRunItem]);
    showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);
    getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();

    showLogInEditorStub = sandbox.stub(logInEditor, 'showLogInEditor').resolves();
    configurationStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({ get: () => false } as unknown as vscode.WorkspaceConfiguration);
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('list command', () => {
    let termStub: sinon.SinonStub;

    setup(() => {
      termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

      test('executes the list tkn command in terminal', async () => {
        await PipelineRun.list(pipelineRunItem);
        expect(termStub).calledOnceWith(Command.listPipelineRunsInTerminal(pipelineRunItem.getName()));
      });

    });

    suite('called from command palette', () => {

      test('calls the appropriate error message when no pipeline Run found', async () => {
        getPipelineNamesStub.restore();
        try {
          await PipelineRun.list(null);
        } catch (err) {
          expect(err.message).equals(errorMessage.Pipeline);
          return;
        }
      });
    });

    suite('called from command bar', () => {


      test('returns null when clustertask is not defined properly', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineRun.list(null);
        // tslint:disable-next-line: no-unused-expression
        expect(result).null;
      });

      test('skips tkn command execution if canceled by user', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        await PipelineRun.describe(null);
        // tslint:disable-next-line: no-unused-expression
        expect(termStub).not.called;
      });
    });

    suite('describe', () => {


      test('returns null when cancelled', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineRun.describe(null);

        expect(result).equals(null);
      });

      test('describe calls the correct tkn command in terminal', async () => {
        await PipelineRun.describe(pipelineRunItem);
        expect(termStub).calledOnceWith(Command.describePipelineRuns(pipelineRunItem.getName()));
      });

    });

    suite('log output', () => {

      test('Log calls the correct tkn command in terminal  w/ context', async () => {
        await PipelineRun.logs(pipelineRunItem);

        expect(termStub).calledOnceWith(Command.showPipelineRunLogs(pipelineRunItem.getName()));
      });

      test('fails with no context', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineRun.logs(null);

        // tslint:disable-next-line: no-unused-expression
        expect(result).to.be.undefined;
      });

      test('Show Log in editor', async () => {
        configurationStub.returns({ get: () => true } as unknown as vscode.WorkspaceConfiguration);

        await PipelineRun.logs(pipelineRunItem);

        expect(showLogInEditorStub).calledOnceWith(Command.showPipelineRunLogs(pipelineRunItem.getName()));
      });

    });

    suite('followLog', () => {

      test('followLog calls the correct tkn command in terminal', async () => {
        await PipelineRun.followLogs(pipelineRunItem);

        expect(termStub).calledOnceWith(Command.showPipelineRunFollowLogs(pipelineRunItem.getName()));
      });

      test('Follow Log in editor', async () => {
        configurationStub.returns({ get: () => true } as unknown as vscode.WorkspaceConfiguration);

        await PipelineRun.followLogs(pipelineRunItem);

        expect(showLogInEditorStub).calledOnceWith(Command.showPipelineRunFollowLogs(pipelineRunItem.getName()));
      });

    });

    suite('cancel', () => {


      test('returns undefined when cancelled', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineRun.cancel(null);
        expect(result).equals(null);
      });

      test('Cancel calls the correct tkn command in terminal  w/ context', async () => {
        await PipelineRun.cancel(pipelineRunItem);

        expect(termStub).calledOnceWith(Command.cancelPipelineRun(pipelineRunItem.getName()));
      });

    });
  });
});
