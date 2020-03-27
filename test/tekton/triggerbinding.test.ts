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
import { TriggerBinding } from '../../src/tekton/triggerbinding';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/TriggerBinding', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  const triggerBindingNode = new TestItem(TknImpl.ROOT, 'test-trigger', ContextType.TRIGGERBINDING, null);
  const triggerBindingItem = new TestItem(triggerBindingNode, 'TriggerBinding', ContextType.EVENTLISTENER, null);


  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTriggerTemplates').resolves([triggerBindingItem]);
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

      await TriggerBinding.delete(triggerBindingItem);

      expect(execStub).calledOnceWith(Command.deleteTriggerBinding(triggerBindingItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await TriggerBinding.delete(triggerBindingItem);

      expect(result).equals(`The TriggerBinding '${triggerBindingItem.getName()}' successfully deleted.`);
    });

    test('returns null when cancelled', async() => {
      warnStub.resolves('Cancel');

      const result = await TriggerBinding.delete(triggerBindingItem);

      expect(result).null;
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError: Error;
      try {
        await TriggerBinding.delete(triggerBindingItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the TriggerBinding '${triggerBindingItem.getName()}': 'ERROR'.`);
    });
  });
});
