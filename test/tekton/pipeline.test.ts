/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl } from '../../src/tkn';
import { Pipeline } from '../../src/tekton/pipeline';
import { PipelineExplorer } from '../../src/pipeline/pipelineExplorer';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';
import { Trigger, StartObject, NameType, Resources, Params, PipelineContent } from '../../src/tekton/pipelinecontent';
import { ContextType } from '../../src/context-type';
import { Command } from '../../src/cli-command';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();
  let getPipelineStub: sinon.SinonStub;
  let termStub: sinon.SinonStub;
  let pipeTrigger: Trigger[];
  let startPipelineObj: StartObject;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineNode = new TestItem(TknImpl.ROOT, 'test-pipeline', ContextType.PIPELINENODE, null);
  const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE, null);


  setup(() => {
    sandbox.stub(vscode.workspace, 'getConfiguration').returns({
      get<T>(): Promise<T|undefined> {
        return Promise.resolve(undefined);
      },
      update(): Promise<void> {
        return Promise.resolve();
      },
      inspect(): {
          key: string;
          } {
        return undefined;
      },
      has(): boolean {
        return true;
      },
      start: true
    });
    sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);
    sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
    getPipelineStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
    sandbox.stub(vscode.window, 'showInputBox').resolves();
    termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('called from \'Tekton Pipelines Explorer\'', () => {

    test('executes the list tkn command in terminal', async () => {
      await Pipeline.list(pipelineItem);
      expect(termStub).calledOnceWith(Command.listPipelinesInTerminal(pipelineItem.getName()));
    });

  });

  suite('called from command palette', () => {

    test('calls the appropriate error message when no pipeline found', async () => {
      getPipelineStub.restore();
      sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
      try {
        await Pipeline.list(null);
      } catch (err) {
        expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
        return;
      }
    });
  });

  suite('start', () => {

    test('start returns null when no pipeline', async () => {
      showQuickPickStub.onFirstCall().resolves(undefined);
      const result = await Pipeline.start(null);
      expect(result).null;
    });

  });

  suite('describe', () => {

    test('describe calls the correct tkn command in terminal', async () => {
      await Pipeline.describe(pipelineItem);
      expect(termStub).calledOnceWith(Command.describePipelines(pipelineItem.getName()));
    });

  });

  suite('start', () => {

    setup(() => {

      const testNames: NameType[] = [{
        name: 'test',
        type: 'test-type'
      }];

      const testResources: Resources[] = [
        {
          name: 'test-resource1',
          resourceRef: 'resource1'
        },
        {
          name: 'test-resource2',
          resourceRef: 'resource1'
        }
      ];
      const testParams: Params[] = [
        {
          default: 'package',
          description: 'Param test description',
          name: 'test-param1'
        },
        {
          default: 'package',
          description: 'Param test description',
          name: 'test-param2'
        }
      ];

      pipeTrigger = [{
        name: 'pipeline',
        resources: testNames,
        params: testParams,
        serviceAcct: undefined
      }];

      startPipelineObj = {
        name: 'pipeline',
        resources: testResources,
        params: testParams,
        workspaces: [],
        serviceAccount: undefined
      };
    });

    test('starts a pipeline with appropriate resources', async () => {
      sandbox.stub(PipelineContent, 'startObject').withArgs(pipeTrigger, 'Pipeline').resolves(startPipelineObj);
      sandbox.stub(Pipeline, 'start').withArgs(pipelineItem).resolves('Pipeline \'pipeline\' successfully created');
      const result = await Pipeline.start(pipelineItem);
      expect(result).equals(`Pipeline '${startPipelineObj.name}' successfully created`);
    });

    test('returns null if no pipeline selected', async () => {
      const result = await Pipeline.start(undefined);
      expect(result).equals(null);
    });

  });


  suite('about', () => {
    test('calls the proper tkn command in terminal', () => {
      Pipeline.about();

      expect(termStub).calledOnceWith(Command.printTknVersion());
    });
  });

  suite('refresh', () => {
    test('calls refresh on the explorer', () => {
      const stub = sandbox.stub(PipelineExplorer.prototype, 'refresh');
      Pipeline.refresh();
      expect(stub).calledOnce;
    });
  });

});
