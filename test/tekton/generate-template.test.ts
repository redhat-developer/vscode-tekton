/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { cli } from '../../src/cli';
import * as taskRunTemplate from '../../src/tekton/generate-template'
import { TestItem } from './testTektonitem';
import { TknImpl } from '../../src/tkn';
import { EndOfLine, TextDocument, window, workspace } from 'vscode';
import { newK8sCommand } from '../../src/cli-command';
import { ContextType } from '../../src/context-type';


const expect = chai.expect;
chai.use(sinonChai);


suite('Tekton/TaskRunTemplate', () => {
  const sandbox = sinon.createSandbox();
  let openTextStub: sinon.SinonStub;
  let cliExecuteStub: sinon.SinonStub;
  const taskNode = new TestItem(TknImpl.ROOT, 'test-task', ContextType.TASKNODE, null);
  const taskItem = new TestItem(taskNode, 'task', ContextType.TASK, null);

  const textDocument: TextDocument = {
    uri: undefined,
    fileName: 'untitled',
    isClosed: false,
    isDirty: false,
    isUntitled: false,
    languageId: '',
    version: 1,
    eol: EndOfLine.CRLF,
    save: undefined,
    lineCount: 33,
    lineAt: undefined,
    getText: () => '',
    getWordRangeAtPosition: undefined,
    offsetAt: undefined,
    positionAt: undefined,
    validatePosition: undefined,
    validateRange: undefined
  };

  setup(() => {
    cliExecuteStub = sandbox.stub(cli, 'execute');
    openTextStub = sandbox.stub(workspace, 'openTextDocument').resolves(textDocument);
    sandbox.stub(window, 'showTextDocument').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('"readFile" should return file content for taskrun', async () => {
    cliExecuteStub.resolves({ stdout: JSON.stringify({
      apiVersion:'tekton.dev/v1beta1',
      kind:'Task',
      spec: {
        params: [
          {
            name:'filename',
            type:'string'
          }
        ],
        workspaces: [
          {
            name:'storage'
          }
        ],
        resources: {
          inputs: [
            {
              name: 'optional-workspace',
              type: 'git'
            }
          ],
          outputs: [
            {
              name: 'workspace',
              type: 'git'
            }
          ]
        }
      }
    })});
    await taskRunTemplate.openTaskRunTemplate(taskItem);
    expect(openTextStub).calledOnce;
    expect(cliExecuteStub).calledOnceWith(newK8sCommand(`get task ${taskItem.getName()} -o json`));
  });

  test('should return template file for PipelineRun', async () => {
    cliExecuteStub.resolves({ stdout: JSON.stringify({
      apiVersion:'tekton.dev/v1beta1',
      kind:'Pipeline',
      spec: {
        params: [
          {
            name:'filename',
            type:'string'
          }
        ],
        workspaces: [
          {
            name:'storage'
          }
        ],
        resources: [
          {
            name: 'optional-workspace',
            type: 'git'
          }
        ]
      }
    })});
    await taskRunTemplate.openPipelineRunTemplate(taskItem);
    expect(openTextStub).calledOnce;
    expect(cliExecuteStub).calledOnceWith(newK8sCommand(`get pipeline ${taskItem.getName()} -o json`));
  });

})
