/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { PipelineResource } from '../../src/tekton/pipelineresource';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';
import { window, MessageItem, MessageOptions } from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/PipelineResource', () => {
  const sandbox = sinon.createSandbox();
  const errorMessage = 'FATAL ERROR';
  let execStub: sinon.SinonStub;
  let warnStub: sinon.SinonStub<[string, MessageOptions, ...MessageItem[]], Thenable<MessageItem>>;
  let getPipelineNamesStub: sinon.SinonStub;
  let getPipelineResourcesStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineItem = new TestItem(null, 'pipeline', ContextType.PIPELINE);
  const pipelineResourceItem = new TestItem(pipelineItem, 'pipelineresource', ContextType.PIPELINERUN, undefined, '2019-07-25T12:03:00Z', 'True');

  const sampleYaml = `
    # manifests.yaml
    apiVersion: tekton.dev/v1alpha1
    kind: PipelineResource
    metadata:
        name: api-repo
    spec:
        type: git
    params: 
        - name: url
          value: http://github.com/openshift-pipelines/vote-api.git
    `;

  const TextEditorMock = {
    document: {
      fileName: 'manifests.yaml',
      getText: sinon.stub().returns(sampleYaml),
    },
  };

  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '' });
    getPipelineResourcesStub = sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([pipelineResourceItem]);
    getPipelineNamesStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
    showQuickPickStub = sandbox.stub(window, 'showQuickPick');
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('create', () => {

    setup(() => {
      warnStub = sandbox.stub(window, 'showWarningMessage').resolves();
    });


    test('show warning message if file is not yaml', async () => {
      await PipelineResource.create(pipelineResourceItem);
      expect(warnStub).is.calledOnce;
    });

    test('Save the file if user click on Save button', async () => {
      execStub.resolves({
        error: undefined,
        stdout: 'text'
      });
      sandbox.stub(window, 'showInformationMessage').resolves('Save');
      sandbox.stub(window, 'activeTextEditor').value({
        document: {
          fileName: 'manifests.yaml',
          isDirty: true,
          save: sinon.stub().returns(true)
        },
      });
      const result = await PipelineResource.create(pipelineResourceItem);
      expect(result).equals('PipelineResources were successfully created.');
    });

    test('show warning message if file content is changed', async () => {
      const infoMsg = sandbox.stub(window, 'showInformationMessage').resolves(undefined);
      sandbox.stub(window, 'activeTextEditor').value({
        document: {
          fileName: 'manifests.yaml',
          isDirty: true,
        },
      });
      await PipelineResource.create(pipelineResourceItem);
      expect(warnStub).is.calledOnce;
      expect(infoMsg).is.calledOnce;
    });

    test('Creates an tekton PipelineResources using .yaml file location from an active editor', async () => {
      execStub.resolves({
        error: undefined,
        stdout: 'text'
      });
      sandbox.stub(window, 'activeTextEditor').value(TextEditorMock);
      const result = await PipelineResource.create(pipelineResourceItem);
      expect(result).equals('PipelineResources were successfully created.');
    });

    test('errors when fail too create resource', async () => {
      let savedErr: Error;
      execStub.rejects(errorMessage);
      sandbox.stub(window, 'activeTextEditor').value(TextEditorMock);
      try {
        await PipelineResource.create(pipelineResourceItem);
      } catch (err) {
        savedErr = err;
      }
      expect(savedErr).equals(`Failed to Create PipelineResources with error: ${errorMessage}`);
    });
  });

  suite('list command', () => {
    let termStub: sinon.SinonStub;

    setup(() => {
      termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

      test('executes the list tkn command in terminal', async () => {
        await PipelineResource.list(pipelineResourceItem);
        expect(termStub).calledOnceWith(Command.listPipelineResourcesInTerminal(pipelineResourceItem.getName()));
      });

    });

    suite('called from command palette', () => {

      test('calls the appropriate error message when no pipeline Resource found', async () => {
        getPipelineNamesStub.restore();
        getPipelineResourcesStub.onFirstCall().returns([]);
        try {
          await PipelineResource.list(null);
        } catch (err) {
          expect(err.message).equals('You need at least one PipelineResource available. Please create new Tekton PipelineResource and try again.');
          return;
        }
        expect.fail();
      });
    });

    suite('called from command bar', () => {

      test('returns null when clustertask is not defined properly', async () => {
        showQuickPickStub.onFirstCall().resolves(undefined);
        const result = await PipelineResource.list(null);
        // tslint:disable-next-line: no-unused-expression
        expect(result).null;
      });

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
