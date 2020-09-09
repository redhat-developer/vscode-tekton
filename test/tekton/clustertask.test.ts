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
  const sandbox = sinon.createSandbox();
  let getClusterTaskStub: sinon.SinonStub;
  const clustertaskNode = new TestItem(TknImpl.ROOT, 'test-clustertask', ContextType.CLUSTERTASK, null);
  const clustertaskItem = new TestItem(clustertaskNode, 'test-clustertask', ContextType.CLUSTERTASK, null);


  setup(() => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({error: null, stdout: '', stderr: ''});
    sandbox.stub(TknImpl.prototype, 'getClusterTasks').resolves([clustertaskItem]);
    getClusterTaskStub = sandbox.stub(TektonItem, 'getClusterTaskNames').resolves([clustertaskItem]);
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
        await ClusterTask.list();
        expect(termStub).calledOnceWith(Command.listClusterTasksInTerminal());
      });

    });

    suite('called from command palette', () => {

      test('calls the appropriate error message when no project found', async () => {
        getClusterTaskStub.restore();
        sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
        try {
          await ClusterTask.list();
        } catch (err) {
          expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
          return;
        }
      });
    });

  });

});
