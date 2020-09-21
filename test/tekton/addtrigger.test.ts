/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TknImpl } from '../../src/tkn';
import { getPipelineRunFrom, createTriggerTemplate, createEventListener } from '../../src/tekton/addtrigger';
import { AddTriggerFormValues, TriggerBindingKind } from '../../src/tekton/triggertype';
import { PipelineRunData, TriggerTemplateKindParam, TriggerTemplateKind } from '../../src/tekton';


const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;

  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
  });

  teardown(() => {
    sandbox.restore();
  });

  const inputAddTrigger: AddTriggerFormValues = {
    name:'sample-pipeline-cluster-task-4',
    params: [],
    resources: [],
    trigger: {
      name:'vote-app',
      resource: {
        apiVersion:'triggers.tekton.dev/v1alpha1',
        kind:'TriggerBinding',
        metadata: {
          name:'vote-app',
          namespace:'pipelines-tutorial'
        },
        spec: {
          params: [{
            name:'git-repo-url',
            value:'$(body.repository.url)'
          }]
        }
      }
    }
  }
  const option: { generateName: boolean } = {
    generateName: true
  }

  const pipelieRun: PipelineRunData = {
    apiVersion:'tekton.dev/v1beta1',
    kind:'PipelineRun',
    metadata: {
      generateName:'sample-pipeline-cluster-task-4-',
      labels: {
        'tekton.dev/pipeline':'sample-pipeline-cluster-task-4'
      }
    },
    spec: {
      params: [],
      pipelineRef: {
        name: 'sample-pipeline-cluster-task-4'
      },
      resources: [],
      workspaces: undefined
    }
  }

  const params: TriggerTemplateKindParam[] = [{
    name:'git-repo-url'
  }]

  const triggerTemplate: TriggerTemplateKind = {
    apiVersion:'triggers.tekton.dev/v1alpha1',
    kind:'TriggerTemplate',
    metadata: {
      name:'trigger-template-sample-pipeline-cluster-task-4-z0we6m'
    },
    spec: {
      params: [{
        name:'git-repo-url'
      }],
      resourcetemplates: [{
        apiVersion:'tekton.dev/v1beta1',
        kind:'PipelineRun',
        metadata: {
          generateName:'sample-pipeline-cluster-task-4-',
          labels: {
            'tekton.dev/pipeline':'sample-pipeline-cluster-task-4'
          }
        },
        spec: {
          param: [],
          pipelineRef: {
            name:'sample-pipeline-cluster-task-4'
          },
          resources: [],
          status:null,
          workspaces:undefined
        }
      }]
    }
  }

  const triggerBindings: TriggerBindingKind[] = [{
    apiVersion:'triggers.tekton.dev/v1alpha1',
    kind:'TriggerBinding',
    metadata: {
      name:'vote-app'
    },
    spec: {
      params: [{
        name:'git-repo-url',
        value:'$(body.repository.url)'
      }]
    }
  }]

  const pipelineName = 'sample-pipeline-cluster-task-4';

  suite('Add trigger', () => {

    test('create object for pipelineRun', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind:'Pipeline',
        metadata: {
          name:'sample-pipeline-cluster-task-4',
          namespace:'pipelines-tutorial',
          resourceVersion:'34655',
          selfLink:'/apis/tekton.dev/v1beta1/namespaces/pipelines-tutorial/pipelines/sample-pipeline-cluster-task-4',
          uid:'b2e31019-dece-4201-b8b5-e29b627da0aa'
        },
        spec: {
          tasks: [{
            name:'cluster-task-pipeline-4',
            taskRef: {
              kind:'ClusterTask',
              name:'cluster-task-pipeline-4'
            }
          }]
        }
      }), stderr: '' })
      const result = await getPipelineRunFrom(inputAddTrigger, option);
      expect(execStub).called;
      expect(result).deep.equals({
        apiVersion:'tekton.dev/v1beta1',
        kind:'PipelineRun',
        metadata: {
          generateName:'sample-pipeline-cluster-task-4-',
          labels: {
            'tekton.dev/pipeline':'sample-pipeline-cluster-task-4'
          }
        },
        spec: {
          params: [],
          pipelineRef: {
            name:'sample-pipeline-cluster-task-4'
          },
          resources: [],
          status: null,
          workspaces: undefined
        }
      });
    });

    test('create object for TriggerTemplate', async () => {
      sandbox.stub(Math, 'random').returns(1);
      const result = createTriggerTemplate(pipelieRun, params, pipelineName);
      expect(result).deep.equals({
        apiVersion:'triggers.tekton.dev/v1alpha1',
        kind:'TriggerTemplate',
        metadata: {
          name:'trigger-template-sample-pipeline-cluster-task-4-'
        },
        spec: {
          params: [{
            name:'git-repo-url'
          }],
          resourcetemplates: [{
            apiVersion:'tekton.dev/v1beta1',
            kind:'PipelineRun',
            metadata: {
              generateName:'sample-pipeline-cluster-task-4-',
              labels: {
                'tekton.dev/pipeline':'sample-pipeline-cluster-task-4'
              }
            },
            spec: {
              params: [],
              pipelineRef: {
                name:'sample-pipeline-cluster-task-4'
              },
              resources: [],
              workspaces: undefined
            }
          }]
        }
      });
    });

    test('create object for EventListener', async () => {
      sandbox.stub(Math, 'random').returns(1);
      const result = createEventListener(triggerBindings, triggerTemplate);
      expect(result).deep.equals({
        apiVersion:'triggers.tekton.dev/v1alpha1',
        kind:'EventListener',
        metadata: {
          name:'event-listener-'
        },
        spec: {
          serviceAccountName:'pipeline',
          triggers: [{
            bindings: [{
              kind:'TriggerBinding',
              name:'vote-app'
            }],
            template: {
              name:'trigger-template-sample-pipeline-cluster-task-4-z0we6m'
            }
          }]
        }
      });
    });
  });
});
