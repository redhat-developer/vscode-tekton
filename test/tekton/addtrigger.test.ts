/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


'use strict';

import * as os from 'os';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as yaml from 'js-yaml';
import * as sinonChai from 'sinon-chai';
import * as _ from 'lodash';
import { TknImpl } from '../../src/tkn';
import { getPipelineRunFrom, createTriggerTemplate, createEventListener, getPipelineRunWorkspaces, addTriggerToPipeline, addTrigger } from '../../src/tekton/addtrigger';
import { AddTriggerFormValues, TriggerBindingKind } from '../../src/tekton/triggertype';
import { PipelineRunData, TriggerTemplateKindParam, TriggerTemplateKind } from '../../src/tekton';
import { cli } from '../../src/cli';
import { window } from 'vscode';


const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let cliStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let safeDumpStub: sinon.SinonStub;
  let infoMsgStub: sinon.SinonStub;


  setup(() => {
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    cliStub = sandbox.stub(cli, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    osStub = sandbox.stub(os, 'tmpdir').returns('path');
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    safeDumpStub = sandbox.stub(yaml, 'safeDump').returns('empty');
    infoMsgStub = sandbox.stub(window, 'showInformationMessage').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  const triggerContent = {
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

  const createTrigger: AddTriggerFormValues = {
    name:'sample-pipeline-cluster-task-4',
    params: [
      {
        default: 'gcr.io/christiewilson-catfactory',
        name: 'image-registry'
      }
    ],
    resources: [
      {
        name: 'source-repo',
        resourceRef: 'skaffold-git-multiple-output-image'
      }
    ],
    workspaces: [
      {
        name: 'git-source',
        workspaceName: 'test',
        workspaceType: 'PersistentVolumeClaim'
      },
      {
        name: 'git-source',
        workspaceType: 'EmptyDirectory'
      }
    ],
    volumeClaimTemplate: [
      {
        kind: 'volumeClaimTemplate',
        metadata: {
          name: 'git-source'
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '1Mi'
            }
          }
        }
      }
    ],
    trigger: triggerContent,
    serviceAccount: 'default'
  }

  const pipeline = {
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
  }

  const eventListener = {
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
  }

  const serviceResource = {
    spec: {
      ports: [
        {
          name: 'http-listener',
          port: 8080,
          protocol: 'TCP',
          targetPort: 8000
        }
      ]
    }
  }

  const tknVersion = 'Client version: 0.12.1\nPipeline version: v0.16.3\nTriggers version: v0.5.0\n';

  const inputAddTrigger: AddTriggerFormValues = {
    name:'sample-pipeline-cluster-task-4',
    params: [],
    resources: [],
    workspaces: [],
    trigger: triggerContent
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

    test('create object for workspace', async () => {
      const result = getPipelineRunWorkspaces([
        {
          item: [],
          name:'password-vault',
          workspaceName:'sensitive-recipe-storage',
          workspaceType:'ConfigMap'
        },
        {
          item: [],
          name:'recipe-store',
          workspaceName:'secret-password',
          workspaceType:'Secret'
        },
        {
          item: [],
          name:'shared-data',
          workspaceName:'shared-task-storage',
          workspaceType:'PersistentVolumeClaim',
        }
      ]);
      expect(result).deep.equals([
        {
          configMap: {
            name:'sensitive-recipe-storage'
          },
          name:'password-vault'
        },
        {
          name:'recipe-store',
          secret: {
            secretName:'secret-password'
          }
        },
        {
          name:'shared-data',
          persistentVolumeClaim: {
            claimName:'shared-task-storage'
          }
        }
      ]);

    })

    test('create object for pipelineRun', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify(pipeline), stderr: '' });
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
          workspaces: [],
          serviceAccountName: undefined
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
      execStub.onFirstCall().resolves({ error: null, stdout: tknVersion, stderr: '' });
      sandbox.stub(Math, 'random').returns(1);
      const result = await createEventListener(triggerBindings, triggerTemplate);
      expect(result).deep.equals(eventListener);
    });

    test('create trigger', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify(pipeline), stderr: '' });
      cliStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify({kind: 'TriggerTemplate'}), stderr: '' });
      execStub.onSecondCall().resolves({ error: null,
        stdout: tknVersion,
        stderr: '' });
      cliStub.onSecondCall().resolves({ error: null, stdout: JSON.stringify({kind: 'EventListener'}), stderr: '' });
      execStub.onThirdCall().resolves({ error: null,
        stdout: tknVersion,
        stderr: '' });
      execStub.onCall(2).resolves({ error: null,
        stdout: JSON.stringify(eventListener),
        stderr: '' });
      execStub.onCall(3).resolves({ error: null,
        stdout: JSON.stringify(serviceResource),
        stderr: '' });
      cliStub.onSecondCall().resolves({ error: null, stdout: 'successful', stderr: '' });
      execStub.onCall(4).resolves({ error: null,
        stdout: JSON.stringify({
          spec: {
            host: 'el-event-listener-dbpg2j-pipelines-tutorial.apps.dev-svc-4.8-042807.devcluster.openshift.com'
          }
        }),
        stderr: '' });
      sandbox.stub(_, 'get').returns('https');
      await addTriggerToPipeline(createTrigger);
      infoMsgStub.calledOnce;
      safeDumpStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
      unlinkStub.calledOnce;
    });

    test('return null if fails to create triggerTemplate', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify(pipeline), stderr: '' });
      cliStub.onFirstCall().resolves({ error: 'error', stdout: '' });
      const result = await addTrigger(createTrigger);
      expect(result).equals(null);
    });

    test('return null if fails to create eventListener', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify(pipeline), stderr: '' });
      cliStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify({kind: 'TriggerTemplate'}), stderr: '' });
      execStub.onSecondCall().resolves({ error: null,
        stdout: tknVersion,
        stderr: '' });
      cliStub.onSecondCall().resolves({ error: 'error', stdout: '', stderr: '' });
      const result = await addTrigger(createTrigger);
      expect(result).equals(null);
    });

    test('return null if fails to create tempPath', async () => {
      execStub.onFirstCall().resolves({ error: null, stdout: JSON.stringify(pipeline), stderr: '' });
      osStub.onFirstCall().returns(null);
      const result = await addTrigger(createTrigger);
      expect(result).equals(null);
    });
  });
});
