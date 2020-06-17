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

  const pipelineResource = (window as any).cmdText;
  const resources = JSON.parse(pipelineResource).pipelineResource;

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
