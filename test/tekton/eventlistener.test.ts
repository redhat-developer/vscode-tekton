/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';
import { EventListener } from '../../src/tekton/eventlistener';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/EventListener', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  const eventListenerNode = new TestItem(TknImpl.ROOT, 'test-trigger', ContextType.EVENTLISTENER, null);
  const eventListenerItem = new TestItem(eventListenerNode, 'EventListener', ContextType.EVENTLISTENER, null);


  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTriggerTemplates').resolves([eventListenerItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('delete command', () => {
    let warnStub: sinon.SinonStub;

    setup(() => {
      warnStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
    });

    test('calls the appropriate tkn command if confirmed', async () => {
      warnStub.resolves('Yes');

      await EventListener.delete(eventListenerItem);

      expect(execStub).calledOnceWith(Command.deleteEventListeners(eventListenerItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await EventListener.delete(eventListenerItem);

      expect(result).equals(`The EventListener '${eventListenerItem.getName()}' successfully deleted.`);
    });

    test('returns null when cancelled', async() => {
      warnStub.resolves('Cancel');

      const result = await EventListener.delete(eventListenerItem);

      expect(result).null;
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError: Error;
      try {
        await EventListener.delete(eventListenerItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the EventListener '${eventListenerItem.getName()}': 'ERROR'.`);
    });
  });
});
