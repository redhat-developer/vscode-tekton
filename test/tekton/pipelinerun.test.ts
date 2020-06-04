/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { PipelineRun } from '../../src/tekton/pipelinerun';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';
import { pipelineExplorer } from '../../src/pipeline/pipelineExplorer';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineRun', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let getPipelineNamesStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineRunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');

  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getPipelineRuns').resolves([pipelineRunItem]);
    sandbox.stub(TknImpl.prototype, 'getPipelineRunsList').resolves([pipelineRunItem]);
    showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);
    getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
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
          expect(err.message).equals('You need at least one PipelineRun available. Please create new Tekton PipelineRun and try again.');
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
        expect(result).null;
      });

    });

    suite('followLog', () => {

      test('followLog calls the correct tkn command in terminal', async () => {
        await PipelineRun.followLogs(pipelineRunItem);

        expect(termStub).calledOnceWith(Command.showPipelineRunFollowLogs(pipelineRunItem.getName()));
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

    suite('delete command', () => {
      let warnStub: sinon.SinonStub;

      setup(() => {
        sandbox.stub(pipelineExplorer, 'refresh').resolves();
        warnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
      });

      test('calls the appropriate tkn command if confirmed', async () => {
        warnStub.resolves('Yes');

        await PipelineRun.delete(pipelineRunItem);

        expect(execStub).calledOnceWith(Command.deletePipelineRun(pipelineRunItem.getName()));
      });

      test('returns a confirmation message text when successful', async () => {
        warnStub.resolves('Yes');

        const result = await PipelineRun.delete(pipelineRunItem);

        expect(result).equals(`The PipelineRun '${pipelineRunItem.getName()}' successfully deleted.`);
      });

      test('returns null when cancelled', async () => {
        warnStub.resolves('Cancel');

        const result = await PipelineRun.delete(pipelineRunItem);

        expect(result).equals(null);
      });

      test('throws an error message when command failed', async () => {
        warnStub.resolves('Yes');
        execStub.rejects('ERROR');
        let expectedError;
        try {
          await PipelineRun.delete(pipelineRunItem);
        } catch (err) {
          expectedError = err;
        }
        expect(expectedError).equals(`Failed to delete the PipelineRun '${pipelineRunItem.getName()}': 'ERROR'.`);
      });
    });
  });
});
