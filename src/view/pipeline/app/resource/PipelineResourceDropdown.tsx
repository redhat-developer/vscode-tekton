/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/



import * as React from 'react';
import * as _ from 'lodash';
import { FormikValues, useField, useFormikContext } from 'formik';
import { Select, SelectOption } from '@patternfly/react-core';
import { CREATE_PIPELINE_RESOURCE } from '../common/const';
import { PipelineResourceKind } from '../utils/pipeline-augment';

import './PipelineResourceDropdown.scss';

type PipelineResourceDropdownProps = {
  autoSelect?: boolean;
  filterType: string;
  name: string;
  namespace: string;
  selectedKey: string;
};

const PipelineResourceDropdown: React.FC<PipelineResourceDropdownProps> = (props) => {
  const { autoSelect, filterType, name, selectedKey } = props;

  const [isExpanded, setExpanded] = React.useState(false);
  const { setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const [, { touched }] = useField(name);

  const resources = [
    {
      'apiVersion': 'tekton.dev/v1alpha1',
      'kind': 'PipelineResource',
      'metadata': {
        'annotations': {
          'kubectl.kubernetes.io/last-applied-configuration': '{\'apiVersion\':\'tekton.dev/v1alpha1\',\'kind\':\'PipelineResource\',\'metadata\':{\'annotations\':{},\'name\':\'api-image\',\'namespace\':\'pipelines-tutorial\'},\'spec\':{\'params\':[{\'name\':\'url\',\'value\':\'image-registry.openshift-image-registry.svc:5000/pipelines-tutorial/vote-api:latest\'}],\'type\':\'image\'}}\n'
        },
        'creationTimestamp': '2020-06-10T07:34:21Z',
        'generation': 1,
        'managedFields': [
          {
            'apiVersion': 'tekton.dev/v1alpha1',
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
                'f:type': {}
              }
            },
            'manager': 'oc',
            'operation': 'Update',
            'time': '2020-06-10T07:34:21Z'
          }
        ],
        'name': 'api-image',
        'namespace': 'pipelines-tutorial',
        'resourceVersion': '258927',
        'selfLink': '/apis/tekton.dev/v1alpha1/namespaces/pipelines-tutorial/pipelineresources/api-image',
        'uid': '222bd68d-d5d6-4ef3-89e5-682b228ed16b'
      },
      'spec': {
        'params': [
          {
            'name': 'url',
            'value': 'image-registry.openshift-image-registry.svc:5000/pipelines-tutorial/vote-api:latest'
          }
        ],
        'type': 'image'
      }
    },
    {
      'apiVersion': 'tekton.dev/v1alpha1',
      'kind': 'PipelineResource',
      'metadata': {
        'annotations': {
          'kubectl.kubernetes.io/last-applied-configuration': '{\'apiVersion\':\'tekton.dev/v1alpha1\',\'kind\':\'PipelineResource\',\'metadata\':{\'annotations\':{},\'name\':\'api-repo\',\'namespace\':\'pipelines-tutorial\'},\'spec\':{\'params\':[{\'name\':\'url\',\'value\':\'http://github.com/openshift-pipelines/vote-api.git\'}],\'type\':\'git\'}}\n'
        },
        'creationTimestamp': '2020-06-10T07:34:20Z',
        'generation': 1,
        'managedFields': [
          {
            'apiVersion': 'tekton.dev/v1alpha1',
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
                'f:type': {}
              }
            },
            'manager': 'oc',
            'operation': 'Update',
            'time': '2020-06-10T07:34:20Z'
          }
        ],
        'name': 'api-repo',
        'namespace': 'pipelines-tutorial',
        'resourceVersion': '258905',
        'selfLink': '/apis/tekton.dev/v1alpha1/namespaces/pipelines-tutorial/pipelineresources/api-repo',
        'uid': 'b11e39b0-8cd4-4e4c-afe7-40a9f9f9eeec'
      },
      'spec': {
        'params': [
          {
            'name': 'url',
            'value': 'http://github.com/openshift-pipelines/vote-api.git'
          }
        ],
        'type': 'git'
      }
    }
  ]

  const availableResources: PipelineResourceKind[] = resources.filter(
    (resource) => resource.spec.type === filterType,
  );

  const canAutoSelect = autoSelect && !touched;
  React.useEffect(() => {
    if (canAutoSelect) {
      if (availableResources.length === 0) {
        setFieldValue(name, CREATE_PIPELINE_RESOURCE);
      } else {
        setFieldValue(name, availableResources[0].metadata.name);
      }
      setFieldTouched(name);
    }
  }, [canAutoSelect, name, availableResources, setFieldTouched, setFieldValue]);

  const options = [
    { label: 'Create Pipeline Resource', value: CREATE_PIPELINE_RESOURCE },
    ...availableResources.map((resource) => {
      const resourceName = resource.metadata.name;
      const url = _.find(resource.spec.params, ['name', 'url'])?.value || '';
      const label = url.trim().length > 0 ? `${url} (${resourceName})` : resourceName;

      return { label, value: resourceName };
    }),
  ];

  return (
    <Select
      className='odc-pipeline-resource-dropdown'
      selections={selectedKey}
      isExpanded={isExpanded}
      onToggle={() => setExpanded(!isExpanded)}
      onSelect={(e, value) => {
        setFieldValue(name, value);
        setExpanded(false);
      }}
    >
      {options.map(({ label, value }) => (
        <SelectOption key={value} value={value}>
          {label}
        </SelectOption>
      ))}
    </Select>
  );
};

export default PipelineResourceDropdown;
