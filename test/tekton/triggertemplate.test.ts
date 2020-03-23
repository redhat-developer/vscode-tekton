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
import { TriggerTemplate } from '../../src/tekton/triggertemplate';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/TriggerTemplate', () => {
  let sandbox: sinon.SinonSandbox;
  let execStub: sinon.SinonStub;
  const triggerTemplateNode = new TestItem(TknImpl.ROOT, 'test-trigger', ContextType.TASKNODE, null);
  const triggerTemplateItem = new TestItem(triggerTemplateNode, 'TriggerTemplate', ContextType.TASK, null);


  setup(() => {
    sandbox = sinon.createSandbox();
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    sandbox.stub(TknImpl.prototype, 'getTriggerTemplates').resolves([triggerTemplateItem]);
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

      await TriggerTemplate.delete(triggerTemplateItem);

      expect(execStub).calledOnceWith(Command.deleteTriggerTemplate(triggerTemplateItem.getName()));
    });

    test('returns a confirmation message text when successful', async () => {
      warnStub.resolves('Yes');

      const result = await TriggerTemplate.delete(triggerTemplateItem);

      expect(result).equals(`The TriggerTemplate '${triggerTemplateItem.getName()}' successfully deleted.`);
    });

    test('returns null when cancelled', async() => {
      warnStub.resolves('Cancel');

      const result = await TriggerTemplate.delete(triggerTemplateItem);

      expect(result).null;
    });

    test('throws an error message when command failed', async () => {
      warnStub.resolves('Yes');
      execStub.rejects('ERROR');
      let expectedError;
      try {
        await TriggerTemplate.delete(triggerTemplateItem);
      } catch (err) {
        expectedError = err;
      }
      expect(expectedError).equals(`Failed to delete the TriggerTemplate '${triggerTemplateItem.getName()}': 'ERROR'.`);
    });
  });
});