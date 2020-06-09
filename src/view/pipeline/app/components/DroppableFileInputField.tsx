/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { FormikValues, useField, useFormikContext } from 'formik';
import { FieldProps } from '../common/field-types';
import { getFieldId } from './field-utils';
import { FormGroup } from '@patternfly/react-core';
import { DroppableFileInput } from '../utils/file-input';


const DroppableFileInputField: React.FC<FieldProps> = ({ name, label, helpText }) => {
  const [field] = useField(name);
  const { setFieldValue } = useFormikContext<FormikValues>();
  const fieldId = getFieldId(name, 'droppable-input');
  return (
    <FormGroup fieldId={fieldId}>
      <DroppableFileInput
        label={label}
        onChange={(fileData: string) => setFieldValue(name, fileData)}
        inputFileData={field.value}
        inputFieldHelpText={helpText}
        aria-describedby={`${fieldId}-helper`}
      />
    </FormGroup>
  );
};

export default DroppableFileInputField;
