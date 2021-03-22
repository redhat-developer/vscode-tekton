/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


'use strict';

import * as os from 'os';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestItem } from './testTektonitem';
import { TknImpl } from '../../src/tkn';
import { addTrigger } from '../../src/tekton/trigger';
import { multiStepInput } from '../../src/util/MultiStepInput';
import { ContextType } from '../../src/context-type';


const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();
  let execStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub<unknown[], unknown>;
  const pipelineNode = new TestItem(TknImpl.ROOT, 'test-pipeline', ContextType.PIPELINENODE, null);
  const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE, null);

  setup(() => {
    osStub = sandbox.stub(os, 'tmpdir').resolves();
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    showQuickPickStub = sandbox.stub(multiStepInput, 'showQuickPick').resolves(undefined);
    execStub.onSecondCall().resolves({error: null, stdout: JSON.stringify({
      items: [{
        apiVersion: 'triggers.tekton.dev/v1alpha1',
        kind: 'TriggerBinding',
        metadata: {
          name:'vote-app',
          namespace:'pipelines-tutorial'
        },
        spec: {
          params: {
            name:'git-repo-url',
            value:'$(body.repository.url)'
          }
        }
      }]
    }), stderr: ''});
    execStub.onThirdCall().resolves({error: null, stdout: JSON.stringify({
      items: [{
        apiVersion:'triggers.tekton.dev/v1alpha1',
        kind:'ClusterTriggerBinding',
        metadata: {
          name:'github-pullreq',
          resourceVersion:'46691',
          selfLink:'/apis/triggers.tekton.dev/v1alpha1/clustertriggerbindings/github-pullreq',
        },
        spec: {
          params: [{
            name:'git-repo-url',
            value:'$(body.repository.html_url)'
          }]
        }
      }]
    }), stderr: ''});
    execStub.onCall(3).resolves({error: null, stdout: JSON.stringify({
      items: [{
        apiVersion:'tekton.dev/v1alpha1',
        kind:'PipelineResource',
        metadata: {
          name:'api-image',
          namespace:'pipelines-tutorial',
          resourceVersion:'47437',
          selfLink:'/apis/tekton.dev/v1alpha1/namespaces/pipelines-tutorial/pipelineresources/api-image',
          uid:'8b396852-49e3-4176-bb19-8b72f7657a95'
        }
      }]
    }), stderr: ''});
    execStub.onCall(4).resolves({error: null, stdout: JSON.stringify({
      items: [{
        apiVersion:'tekton.dev/v1beta1',
        kind:'Pipeline',
        metadata: {
          creationTimestamp:'2020-09-20T18:00:22Z',
          generation:1,
          name:'sample-pipeline-cluster-task-4',
          namespace:'pipelines-tutorial',
          resourceVersion:'509850',
          selfLink:'/apis/tekton.dev/v1beta1/namespaces/pipelines-tutorial/pipelines/sample-pipeline-cluster-task-4',
          uid:'b171b2ab-16fb-4ff1-8ba6-d11ccecc90e1'
        }
      }]
    }), stderr: ''});
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('Add trigger', () => {

    test('create object for add trigger webview', async () => {
      execStub.onFirstCall().resolves({error: null, stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind:'Pipeline',
        metadata: {
          name:'build-and-deploy',
          namespace:'pipelines-tutorial'
        },
        spec: {
          params: [{
            description:'name of the deployment to be patched',
            name:'deployment-name',
            type:'string'
          }],
          resources: [{
            name:'git-repo',
            type:'git'
          }]
        }
      }), stderr: ''});
      await addTrigger(pipelineItem);
      expect(execStub).called;
    });

    test('create object for add trigger QuickPick for less input', async () => {
      execStub.onFirstCall().resolves({error: null, stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind:'Pipeline',
        metadata: {
          name:'build-and-deploy',
          namespace:'pipelines-tutorial'
        },
        spec: {
          task: [{
            name:'cluster-task-pipeline-4'
          }]
        }
      }), stderr: ''});
      showQuickPickStub.onFirstCall().resolves({
        label:'vote-app',
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
      });
      execStub.onCall(4).resolves({error: null, stdout: JSON.stringify({
        apiVersion:'tekton.dev/v1beta1',
        kind:'Pipeline',
        metadata: {
          name:'build-and-deploy',
          namespace:'pipelines-tutorial'
        },
        spec: {
          task: [{
            name:'cluster-task-pipeline-4'
          }]
        }
      }), stderr: ''});
      osStub.onFirstCall().returns('path');
      execStub.onCall(5).resolves({error: null, stdout: 'created', stderr: ''});
      osStub.onSecondCall().returns('test');
      execStub.onCall(6).resolves({error: null, stdout: 'created', stderr: ''});
      execStub.onCall(7).resolves({error: null, stdout: JSON.stringify({
        apiVersion:'triggers.tekton.dev/v1alpha1',
        kind:'EventListener',
        metadata: {
          name:'event-listener-szy049',
          namespace:'pipelines-tutorial',
          resourceVersion:'41308',
          selfLink:'/apis/triggers.tekton.dev/v1alpha1/namespaces/pipelines-tutorial/eventlisteners/event-listener-szy049',
          uid:'44061c65-27c3-4589-b3cd-3c6e4a55583e'
        },
        spec: {
          serviceAccountName:'pipeline',
          triggers: [{
            bindings: [{
              kind:'TriggerBinding',
              name:'vote-app'
            }],
            template: {
              name: 'trigger-template-sample-pipeline-cluster-task-4-hv711j'
            }
          }]
        },
        status: {
          address: {
            url:'http://el-event-listener-szy049.pipelines-tutorial.svc.cluster.local:8080'
          },
          conditions: {
            lastTransitionTime:'2020-09-20T20:52:45Z',
            message:'Deployment has minimum availability.',
            reason:'MinimumReplicasAvailable',
            status:'True',
            type:'Available'
          },
          configuration: {
            generatedName:'el-event-listener-szy049'
          }
        }
      }), stderr: ''});
      execStub.onCall(8).resolves({error: null, stdout: JSON.stringify({
        apiVersion:'v1',
        kind:'Service',
        metadata: {
          name:'el-event-listener-szy049',
          namespace:'pipelines-tutorial'
        },
        spec: {
          clusterIP:'172.30.75.125',
          ports: [{
            name:'http-listener',
            port:8080,
            protocol:'TCP',
            targetPort:8080
          }],
          selector: {
            'app.kubernetes.io/managed-by':'EventListener',
            'app.kubernetes.io/part-of':'Triggers',
            eventlistener:'event-listener-szy049'
          }
        }
      }), stderr: ''});
      osStub.onThirdCall().returns('test');
      execStub.onCall(9).resolves({error: null, stdout: 'created', stderr: ''});
      await addTrigger(pipelineItem);
      expect(execStub).called;
      unlinkStub.calledOnce;
      osStub.calledOnce;
      writeFileStub.calledOnce;
    });
  });

});
