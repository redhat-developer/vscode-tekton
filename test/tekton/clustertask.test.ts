/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { ClusterTask } from '../../src/tekton/clustertask';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Clustertask', () => {
  let execStub: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  let getClusterTaskStub: sinon.SinonStub;
  const clustertaskNode = new TestItem(TknImpl.ROOT, 'test-clustertask', ContextType.CLUSTERTASK, null);
  const clustertaskItem = new TestItem(clustertaskNode, 'test-clustertask', ContextType.CLUSTERTASK, null);


  setup(() => {
    sandbox = sinon.createSandbox();
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
    sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([clustertaskItem]);
    getClusterTaskStub = sandbox.stub(TektonItem, 'getClusterTaskNames').resolves([clustertaskItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });


  suite('list command', async () => {
    let termStub: sinon.SinonStub;

    setup(() => {
      termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

      test('executes the list tkn command in terminal', async () => {
        await ClusterTask.list(clustertaskItem);
        expect(termStub).calledOnceWith(Command.listClusterTasksinTerminal());
      });

    });

    suite('called from command palette', () => {

      test('calls the appropriate error message when no project found', async () => {
        getClusterTaskStub.restore();
        sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
        try {
          await ClusterTask.list(null);
        } catch (err) {
          expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
          return;
        }
      });
    });

  });

  suite('delete command', () => {
    let warnStub: sinon.SinonStub;

    setup(() => {
      warnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
    });

    test('calls the appropriate tkn command if confirmed', async () => {
      warnStub.resolves('Yes');

      await ClusterTask.delete(clustertaskItem);

      expect(execStub).calledOnceWith(Command.deleteClusterTask(clustertaskItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await ClusterTask.delete(clustertaskItem);

      expect(result).equals(`The ClusterTask '${clustertaskItem.getName()}' successfully deleted.`);
    });

    test('returns null when cancelled', async() => {
      warnStub.resolves('Cancel');

      const result = await ClusterTask.delete(clustertaskItem);

      expect(result).null;
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError;
      try {
        await ClusterTask.delete(clustertaskItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the ClusterTask '${clustertaskItem.getName()}': 'ERROR'.`);
    });
  });

});
