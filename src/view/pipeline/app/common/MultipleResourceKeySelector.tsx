/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as React from 'react';
import { useField, useFormikContext, FormikValues } from 'formik';
import cx from 'classnames';
import * as fuzzy from 'fuzzysearch';
import * as _ from 'lodash';
import { K8sKind, K8sResourceKind } from '../k8s/type';
import { FormGroup } from '@patternfly/react-core';
import { getFieldId } from '../components/field-utils';
import { useFormikValidationFix } from './formik-validation-fix';
import ResourceDropdown from '../dropdown/ResourceDropdown';


interface MultipleResourceKeySelectorProps {
  label: string;
  resourceModel: K8sKind;
  required?: boolean;
  resourceNameField: string;
  resourceKeysField: string;
}

const MultipleResourceKeySelector: React.FC<MultipleResourceKeySelectorProps> = ({
  label,
  resourceModel,
  required,
  resourceNameField,
  resourceKeysField,
}) => {
  const { setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const [field, { touched, error }] = useField(resourceNameField);
  const isValid = !(touched && error);
  const fieldId = getFieldId(resourceNameField, 'res-dropdown');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setKeys] = React.useState({});

  useFormikValidationFix(field.value);

  // const resources = [
  //   {
  //     'apiVersion': 'v1',
  //     'data': {
  //       '.dockercfg': ''
  //     },
  //     'kind': 'Secret',
  //     'metadata': {
  //       'annotations': {
  //         'kubernetes.io/service-account.name': 'builder',
  //         'kubernetes.io/service-account.uid': '6532d3a0-361a-43f3-b58d-1f7e30d674e8',
  //         'openshift.io/token-secret.name': 'builder-token-sz9ml',
  //         'openshift.io/token-secret.value': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVyTXJlc08teEtlZU1makhwSVpQWkZZREN0T3NuaEptR0lnTk94V0ktLVUifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJwaXBlbGluZXMtdHV0b3JpYWwiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlY3JldC5uYW1lIjoiYnVpbGRlci10b2tlbi1zejltbCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50Lm5hbWUiOiJidWlsZGVyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiNjUzMmQzYTAtMzYxYS00M2YzLWI1OGQtMWY3ZTMwZDY3NGU4Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OnBpcGVsaW5lcy10dXRvcmlhbDpidWlsZGVyIn0.JgBoFRR6Uw80iw04CDIltJNlR-vr66UMbdjLoLg7utlV2p4crcJ-ydFjlgwBY6lc-mC0sQ5wKFBkjwsri2xOyZVxFfpjWKBNI8TRM_KN131fH3vE4bnPF80v47l662LDltHZpzXptHNq3Ua5eHYts0oMPOOMEoe_U7_9iRwga-F4n2PMnv9lZWKmwSA7wNYKKRd7ZOmwHDXgKY20XQ4fw5olcBn4sS3uV6wAG54Z54pdCdQ0mPkl8U3THcxDHbK8sHtN4GZsPpo8dNr3SHvEcv-qEmtn-43bM7j1kdnB8kmUmAE8wNdD-FXD8jD0A8yl6GENl3YHhDFB8u6UHxJHbA'
  //       },
  //       'creationTimestamp': '2020-06-16T10:02:53Z',
  //       'managedFields': [
  //         {
  //           'apiVersion': 'v1',
  //           'fieldsType': 'FieldsV1',
  //           'fieldsV1': {
  //             'f:data': {
  //               '.': {},
  //               'f:.dockercfg': {}
  //             },
  //             'f:metadata': {
  //               'f:annotations': {
  //                 '.': {},
  //                 'f:kubernetes.io/service-account.name': {},
  //                 'f:kubernetes.io/service-account.uid': {},
  //                 'f:openshift.io/token-secret.name': {},
  //                 'f:openshift.io/token-secret.value': {}
  //               },
  //               'f:ownerReferences': {
  //                 '.': {},
  //                 'k:{"uid":"10a0cb67-fb40-43cf-8a4b-0804487596b3"}': {
  //                   '.': {},
  //                   'f:apiVersion': {},
  //                   'f:blockOwnerDeletion': {},
  //                   'f:controller': {},
  //                   'f:kind': {},
  //                   'f:name': {},
  //                   'f:uid': {}
  //                 }
  //               }
  //             },
  //             'f:type': {}
  //           },
  //           'manager': 'openshift-controller-manager',
  //           'operation': 'Update',
  //           'time': '2020-06-16T10:02:53Z'
  //         }
  //       ],
  //       'name': 'builder-dockercfg-ct4jn',
  //       'namespace': 'pipelines-tutorial',
  //       'ownerReferences': [
  //         {
  //           'apiVersion': 'v1',
  //           'blockOwnerDeletion': false,
  //           'controller': true,
  //           'kind': 'Secret',
  //           'name': 'builder-token-sz9ml',
  //           'uid': '10a0cb67-fb40-43cf-8a4b-0804487596b3'
  //         }
  //       ],
  //       'resourceVersion': '359242',
  //       'selfLink': '/api/v1/namespaces/pipelines-tutorial/secrets/builder-dockercfg-ct4jn',
  //       'uid': '244add22-a06d-4063-a90f-b0f6d299b6ff'
  //     },
  //     'type': 'kubernetes.io/dockercfg'
  //   }
  // ]

  const resources = [
    {
      'apiVersion': 'v1',
      'data': {
        'loglevel.eventlistener': 'info',
        'zap-logger-config': '{"level": "info","development": false,"sampling": {"initial": 100,"thereafter": 100},"outputPaths": ["stdout"],"errorOutputPaths": ["stderr"],"encoding": "json","encoderConfig": {"timeKey": "","levelKey": "level","nameKey": "logger","callerKey": "caller","messageKey": "msg","stacktraceKey": "stacktrace","lineEnding": "","levelEncoder": "","timeEncoder": "","durationEncoder": "","callerEncoder": ""}}'
      },
      'kind': 'ConfigMap',
      'metadata': {
        'creationTimestamp': '2020-06-16T14:26:39Z',
        'managedFields': [
          {
            'apiVersion': 'v1',
            'fieldsType': 'FieldsV1',
            'fieldsV1': {
              'f:data': {
                '.': {},
                'f:loglevel.eventlistener': {},
                'f:zap-logger-config': {}
              }
            },
            'manager': 'openshift-pipelines-triggers-controller',
            'operation': 'Update',
            'time': '2020-06-16T14:26:39Z'
          }
        ],
        'name': 'config-logging-triggers',
        'namespace': 'pipelines-tutorial',
        'resourceVersion': '155129',
        'selfLink': '/api/v1/namespaces/pipelines-tutorial/configmaps/config-logging-triggers',
        'uid': '6d461540-ced9-4ac1-a27d-2c62b4dd58fb'
      }
    },
    {
      'apiVersion': 'v1',
      'data': {
        'brownies': '1. Heat oven to 325 degrees F\n2. Melt 1/2 cup butter w/ 1/2 cup cocoa, stirring smooth.\n3. Remove from heat, allow to cool for a few minutes.\n4. Transfer to bowl.\n5. Whisk in 2 eggs, one at a time.\n6. Stir in vanilla.\n7. Separately combine 1 cup sugar, 1/4 cup flour, 1 cup chopped\n   walnuts and pinch of salt\n8. Combine mixtures.\n9. Bake in greased pan for 30 minutes. Watch carefully for\n   appropriate level of gooeyness.\n'
      },
      'kind': 'ConfigMap',
      'metadata': {
        'creationTimestamp': '2020-06-16T14:34:18Z',
        'managedFields': [
          {
            'apiVersion': 'v1',
            'fieldsType': 'FieldsV1',
            'fieldsV1': {
              'f:data': {
                '.': {},
                'f:brownies': {}
              }
            },
            'manager': 'kubectl',
            'operation': 'Update',
            'time': '2020-06-16T14:34:18Z'
          }
        ],
        'name': 'sensitive-recipe-storage',
        'namespace': 'pipelines-tutorial',
        'resourceVersion': '162427',
        'selfLink': '/api/v1/namespaces/pipelines-tutorial/configmaps/sensitive-recipe-storage',
        'uid': 'bee49214-6433-4801-918b-41e495ad982c'
      }
    }
  ]

  const autocompleteFilter = (strText, item): boolean => fuzzy(strText, item?.props?.name);

  const generateKeys = (resourceName: string) => {
    const selectedResource: K8sResourceKind = _.find(resources, (res) => {
      return _.get(res, 'metadata.name') === resourceName;
    });
    const keyMap = selectedResource?.data;
    const itemKeys = Object.keys(keyMap).reduce((acc, key) => ({ ...acc, [key]: key }), {});
    setKeys(itemKeys);
  };

  return (
    <FormGroup
      fieldId={fieldId}
      label={label}
      isValid={isValid}
      className="odc-multiple-key-selector"
      isRequired={required}
    >
      <ResourceDropdown
        resources={[
          { kind: resourceModel.kind, data: resources as K8sResourceKind[] },
        ]}
        dataSelector={['metadata', 'name']}
        selectedKey={field.value}
        placeholder={`Select a ${resourceModel.label}`}
        autocompleteFilter={autocompleteFilter}
        dropDownClassName={cx({ 'dropdown--full-width': true })}
        onChange={(value: string) => {
          setFieldValue(resourceKeysField, undefined);
          setFieldValue(resourceNameField, value);
          setFieldTouched(resourceNameField, true);
          generateKeys(value);
        }}
        showBadge
      />
      {/* {field.value && <MultipleKeySelector name={resourceKeysField} keys={keys} />} */}
    </FormGroup>
  );
};

export default MultipleResourceKeySelector;
