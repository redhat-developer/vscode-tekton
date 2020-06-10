/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { useField, useFormikContext, FormikValues } from 'formik';
import { FormGroup } from '@patternfly/react-core';
import { DropdownFieldProps } from '../common/field-types';
import { PipelineModalFormResource } from '../common/types';
import { CREATE_PIPELINE_RESOURCE } from '../common/const';
import { useFormikValidationFix } from '../common/formik-validation-fix';
import PipelineResourceParam from '../pipeline-resource/PipelineResourceParam';
import PipelineResourceDropdown from './PipelineResourceDropdown';


type PipelineResourceDropdownFieldProps = DropdownFieldProps & {
  filterType?: string;
};

const PipelineResourceDropdownField: React.FC<PipelineResourceDropdownFieldProps> = (props) => {
  const { filterType, name, label } = props;

  const [field] = useField<PipelineModalFormResource>(name);
  const { values } = useFormikContext<FormikValues>();
  const { namespace } = values;
  const {
    value: { selection },
  } = field;
  const creating = selection === CREATE_PIPELINE_RESOURCE;

  useFormikValidationFix(field.value);

  return (
    <>
      <FormGroup fieldId={name} label={label} isRequired>
        <PipelineResourceDropdown
          {...props}
          autoSelect={selection == null}
          filterType={filterType}
          namespace={namespace}
          name={`${name}.selection`}
          selectedKey={selection}
        />
      </FormGroup>

      {creating && <PipelineResourceParam name={`${name}.data`} type={filterType} />}
    </>
  );
};

export default PipelineResourceDropdownField;
