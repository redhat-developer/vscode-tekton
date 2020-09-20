/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { EventListenerKind } from '../../src/tekton';
import { createEventListenerRoute } from '../../src/tekton/expose';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
  const sandbox = sinon.createSandbox();

  teardown(() => {
    sandbox.restore();
  });

  const eventListener: EventListenerKind = {
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
  }

  suite('Add trigger', () => {
    test('create object for EventListener', async () => {
      sandbox.stub(Math, 'random').returns(1);
      const result = createEventListenerRoute(eventListener, 'el-event-listener-k4rcpf');
      expect(result).deep.equals({
        apiVersion:'route.openshift.io/v1',
        kind:'Route',
        metadata: {
          name:'el-event-listener-k4rcpf',
          labels: {
            'app.kubernetes.io/managed-by':'EventListener',
            'app.kubernetes.io/part-of':'Triggers',
            eventlistener:'event-listener-jwwe6j'
          }
        },
        spec: {
          port: {
            targetPort:8080
          },
          to: {
            kind:'Service',
            name:'el-event-listener-k4rcpf',
            weight:100
          }
        }
      });
    });
  });
});
