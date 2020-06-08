/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { Formik } from 'formik';
import { StartPipelineFormValues, PipelineWorkspace } from './types';
import { convertPipelineToModalData } from './utils';
import { startPipelineSchema } from './validation-utils';
import ModalStructure from './ModalStructure';
import StartPipelineForm from './StartPipelineForm';

const pipeline = {
  'apiVersion': 'tekton.dev/v1beta1',
  'kind': 'Pipeline',
  'metadata': {
    'annotations': {
      'kubectl.kubernetes.io/last-applied-configuration': '{\'apiVersion\':\'tekton.dev/v1beta1\',\'kind\':\'Pipeline\',\'metadata\':{\'annotations\':{},\'name\':\'build-and-deploy\',\'namespace\':\'pipelines-tutorial\'},\'spec\':{\'params\':[{\'description\':\'name of the deployment to be patched\',\'name\':\'deployment-name\',\'type\':\'string\'}],\'resources\':[{\'name\':\'git-repo\',\'type\':\'git\'},{\'name\':\'image\',\'type\':\'image\'}],\'tasks\':[{\'name\':\'build-image\',\'params\':[{\'name\':\'TLSVERIFY\',\'value\':\'false\'}],\'resources\':{\'inputs\':[{\'name\':\'source\',\'resource\':\'git-repo\'}],\'outputs\':[{\'name\':\'image\',\'resource\':\'image\'}]},\'taskRef\':{\'kind\':\'ClusterTask\',\'name\':\'buildah\'}},{\'name\':\'apply-manifests\',\'resources\':{\'inputs\':[{\'name\':\'source\',\'resource\':\'git-repo\'}]},\'runAfter\':[\'build-image\'],\'taskRef\':{\'name\':\'apply-manifests\'}},{\'name\':\'update-deployment\',\'params\':[{\'name\':\'deployment\',\'value\':\'$(params.deployment-name)\'}],\'resources\':{\'inputs\':[{\'name\':\'image\',\'resource\':\'image\'}]},\'runAfter\':[\'apply-manifests\'],\'taskRef\':{\'name\':\'update-deployment\'}}]}}\n'
    },
    'creationTimestamp': '2020-06-05T14:28:13Z',
    'generation': 1,
    'managedFields': [
      {
        'apiVersion': 'tekton.dev/v1beta1',
        'fieldsType': 'FieldsV1',
        'fieldsV1': {
          'f:metadata': {
            'f:annotations': {
              '.': {},
              'f:kubectl.kubernetes.io/last-applied-configuration': {}
            }
          },
          'f:spec': {
            '.': {},
            'f:params': {},
            'f:resources': {},
            'f:tasks': {}
          }
        },
        'manager': 'oc',
        'operation': 'Update',
        'time': '2020-06-05T14:28:13Z'
      }
    ],
    'name': 'build-and-deploy',
    'namespace': 'pipelines-tutorial',
    'resourceVersion': '56200',
    'selfLink': '/apis/tekton.dev/v1beta1/namespaces/pipelines-tutorial/pipelines/build-and-deploy',
    'uid': 'a771e905-15c7-4966-a743-66bbfc60de39'
  },
  'spec': {
    'params': [
      {
        'description': 'name of the deployment to be patched',
        'name': 'deployment-name',
        'type': 'string'
      }
    ],
    'resources': [
      {
        'name': 'git-repo',
        'type': 'git'
      },
      {
        'name': 'image',
        'type': 'image'
      }
    ],
    'tasks': [
      {
        'name': 'build-image',
        'params': [
          {
            'name': 'TLSVERIFY',
            'value': 'false'
          }
        ],
        'resources': {
          'inputs': [
            {
              'name': 'source',
              'resource': 'git-repo'
            }
          ],
          'outputs': [
            {
              'name': 'image',
              'resource': 'image'
            }
          ]
        },
        'taskRef': {
          'kind': 'ClusterTask',
          'name': 'buildah'
        }
      },
      {
        'name': 'apply-manifests',
        'resources': {
          'inputs': [
            {
              'name': 'source',
              'resource': 'git-repo'
            }
          ]
        },
        'runAfter': [
          'build-image'
        ],
        'taskRef': {
          'kind': 'Task',
          'name': 'apply-manifests'
        }
      },
      {
        'name': 'update-deployment',
        'params': [
          {
            'name': 'deployment',
            'value': '$(params.deployment-name)'
          }
        ],
        'resources': {
          'inputs': [
            {
              'name': 'image',
              'resource': 'image'
            }
          ]
        },
        'runAfter': [
          'apply-manifests'
        ],
        'taskRef': {
          'kind': 'Task',
          'name': 'update-deployment'
        }
      }
    ]
  }
}


export default function Header(): JSX.Element {
  // const userStartedLabel = useUserLabelForManualStart();
  const initialValues: StartPipelineFormValues = {
    ...convertPipelineToModalData(pipeline),
    workspaces: (pipeline.spec['workspaces'] || []).map((workspace: PipelineWorkspace) => ({
      ...workspace,
      type: 'EmptyDirectory',
    })),
    secretOpen: false,
  };

  const handleSubmit = (values: StartPipelineFormValues, actions): void => {
    actions.setSubmitting(true);

    // submitStartPipeline(values, pipeline, userStartedLabel)
    //   .then((res) => {
    //     actions.setSubmitting(false);
    //     onSubmit && onSubmit(res);
    //     close();
    //   })
    //   .catch((err) => {
    //     actions.setSubmitting(false);
    //     actions.setStatus({ submitError: err.message });
    //     errorModal({ error: err.message });
    //     close();
    //   });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={startPipelineSchema}
    >
      {(props) => (
        <ModalStructure submitBtnText='Start' title='Start Pipeline' close={close} {...props}>
          <StartPipelineForm {...props} />
        </ModalStructure>
      )}
    </Formik>
  );
}
