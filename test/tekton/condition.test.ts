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
import { Condition } from '../../src/tekton/condition';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Condition', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  const conditionNode = new TestItem(TknImpl.ROOT, 'test-condition', ContextType.CONDITIONSNODE, null);
  const conditionItem = new TestItem(conditionNode, 'Conditions', ContextType.CONDITIONS, null);


  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTriggerTemplates').resolves([conditionItem]);
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

      await Condition.delete(conditionItem);

      expect(execStub).calledOnceWith(Command.deleteCondition(conditionItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await Condition.delete(conditionItem);

      expect(result).equals(`The Condition '${conditionItem.getName()}' successfully deleted.`);
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError: Error;
      try {
        await Condition.delete(conditionItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the Condition '${conditionItem.getName()}': 'ERROR'.`);
    });
  });
});
