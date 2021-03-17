/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


'use strict';

import * as chai from 'chai';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { EventListenerKind } from '../../src/tekton';
import { TriggerTemplate } from '../../src/tekton/triggertemplate';
import { TknImpl } from '../../src/tkn';
import { TestItem } from './testTektonitem';
import { ContextType } from '../../src/context-type';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();
  let exeStub: sinon.SinonStub;
  const pipelineNode = new TestItem(TknImpl.ROOT, 'test-pipeline', ContextType.PIPELINENODE, null);
  const triggerTemplateItem = new TestItem(pipelineNode, 'trigger-template-sample-pipeline-cluster-task-4-awhmgc', ContextType.TRIGGERTEMPLATES, null);

  setup(() => {
    exeStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({
      error: '',
      stdout: ''
    });
  });

  teardown(() => {
    sandbox.restore();
  });

  const eventListener: EventListenerKind[] = [{
    apiVersion:'triggers.tekton.dev/v1alpha1',
    kind:'EventListener',
    metadata: {
      name:'event-listener-jwwe6j',
      namespace:'pipelines-tutorial'
    },
    spec: {
      serviceAccountName:'pipeline',
      triggers: [{
        bindings: [{
          kind:'TriggerBinding',
          name:'vote-app'
        }],
        template: {
          name:'trigger-template-sample-pipeline-cluster-task-4-awhmgc'
        }
      }]
    },
    status: {
      configuration: {
        generatedName:'el-event-listener-jwwe6j'
      }
    }
  }];

  const eventListenerTriggerRef: EventListenerKind[] = [{
    apiVersion:'triggers.tekton.dev/v1alpha1',
    kind:'EventListener',
    metadata: {
      name:'event-listener-jwwe6j',
      namespace:'pipelines-tutorial'
    },
    spec: {
      serviceAccountName:'pipeline',
      triggers: [{
        triggerRef: 'test'
      }]
    },
    status: {
      configuration: {
        generatedName:'el-event-listener-jwwe6j'
      }
    }
  }];

  const triggerData = {
    spec: {
      template: {
        name: 'trigger-template-sample-pipeline-cluster-task-4-awhmgc'
      }
    }
  }

  const route = {
    spec: {
      host: 'test.openshift.com'
    }
  }

  suite('Add trigger', () => {
    test('copy expose URL', async () => {
      exeStub.onFirstCall().resolves({
        error: '',
        stdout: JSON.stringify({items: eventListener})
      });
      exeStub.onSecondCall().resolves({
        error: '',
        stdout: JSON.stringify(route)
      });
      const infoMsg = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Expose URl successfully copied');
      await TriggerTemplate.copyExposeUrl(triggerTemplateItem);
      expect(exeStub).called;
      expect(infoMsg).is.calledOnce;
      expect(await vscode.env.clipboard.readText()).equal('http://test.openshift.com');
    });

    test('copy expose URL for triggerRef', async () => {
      exeStub.onFirstCall().resolves({
        error: '',
        stdout: JSON.stringify({items: eventListenerTriggerRef})
      });
      exeStub.onSecondCall().resolves({
        error: '',
        stdout: JSON.stringify(triggerData)
      });
      exeStub.onThirdCall().resolves({
        error: '',
        stdout: JSON.stringify(route)
      });
    
      const infoMsg = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Expose URl successfully copied');
      await TriggerTemplate.copyExposeUrl(triggerTemplateItem);
      expect(exeStub).called;
      expect(infoMsg).is.calledOnce;
      expect(await vscode.env.clipboard.readText()).equal('http://test.openshift.com');
    });

    test('return null if no EventListener found', async () => {
      exeStub.onFirstCall().resolves({
        error: '',
        stdout: JSON.stringify({items: []})
      });
      const infoMsg = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Expose URl not available');
      const result = await TriggerTemplate.copyExposeUrl(triggerTemplateItem);
      expect(result).equals(null);
      expect(infoMsg).is.calledOnce;
    });

    test('expose URL not found', async () => {
      exeStub.onFirstCall().resolves({
        error: '',
        stdout: JSON.stringify({items: [{
          apiVersion:'triggers.tekton.dev/v1alpha1',
          kind:'EventListener',
          metadata: {
            name:'event-listener-jwwe6j',
            namespace:'pipelines-tutorial'
          },
          spec: {
            serviceAccountName:'pipeline',
            triggers: [{
              bindings: [{
                kind:'TriggerBinding',
                name:'vote-app'
              }],
              template: {
                name:'test'
              }
            }]
          },
          status: {
            configuration: {
              generatedName:'el-event-listener-jwwe6j'
            }
          }
        }]})
      });
      const infoMsg = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Expose URl not available');
      await TriggerTemplate.copyExposeUrl(triggerTemplateItem);
      expect(infoMsg).is.calledOnce;
    });
  });
});
