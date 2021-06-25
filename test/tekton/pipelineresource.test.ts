/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import { PipelineResource } from '../../src/tekton/pipelineresource';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';
import { window } from 'vscode';
import { ContextType } from '../../src/context-type';
import { Command } from '../../src/cli-command';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineResource', () => {
  const sandbox = sinon.createSandbox();
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineResourceItem = new TestItem(pipelineItem, 'pipelineresource', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');

  setup(() => {
    sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '' });
    sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineResourceItem]);
    sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
    showQuickPickStub = sandbox.stub(window, 'showQuickPick');
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('list command', () => {
    let termStub: sinon.SinonStub;

    setup(() => {
      termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from command bar', () => {

      test('skips tkn command execution if canceled by user', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        await PipelineResource.describe(null);
        // tslint:disable-next-line: no-unused-expression
        expect(termStub).not.called;
      });
    });

    suite('describe', () => {

      test('returns null when cancelled', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineResource.describe(null);

        expect(result).null;
      });

      test('describe calls the correct tkn command in terminal', async () => {
        await PipelineResource.describe(pipelineResourceItem);
        expect(termStub).calledOnceWith(Command.describePipelineResource(pipelineResourceItem.getName()));
      });

    });

  });
});
