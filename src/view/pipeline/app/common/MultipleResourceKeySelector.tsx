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
import MultipleKeySelector from './MultipleKeySelector';


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
  const [keys, setKeys] = React.useState({});

  useFormikValidationFix(field.value);
  const pipelineResource = (window as any).cmdText;
  const resources = JSON.parse(pipelineResource)[resourceModel.kind];

  const autocompleteFilter = (strText, item): boolean => fuzzy(strText, item?.props?.name);

  const generateKeys = (resourceName: string) => {
    if (resourceModel.kind !== 'PersistentVolumeClaim') {
      const selectedResource: K8sResourceKind = _.find(resources, (res) => {
        return _.get(res, 'metadata.name') === resourceName;
      });
      const keyMap = selectedResource?.data;
      const itemKeys = Object.keys(keyMap).reduce((acc, key) => ({ ...acc, [key]: key }), {});
      setKeys(itemKeys);
    }
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
      {field.value && <MultipleKeySelector name={resourceKeysField} keys={keys} />}
    </FormGroup>
  );
};

export default MultipleResourceKeySelector;
