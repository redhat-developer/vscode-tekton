/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import cx from 'classnames';
import { useField, useFormikContext, FormikValues } from 'formik';
import { DropdownFieldProps } from '../common/field-types';
import { getFieldId } from '../components/field-utils';
import { useFormikValidationFix } from '../common/formik-validation-fix';
import { FormGroup } from '@patternfly/react-core';
import { Dropdown } from '../utils/dropdown';



const DropdownField: React.FC<DropdownFieldProps> = ({ label, helpText, required, ...props }) => {
  const [field, { touched, error }] = useField(props.name);
  const { setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const fieldId = getFieldId(props.name, 'dropdown');
  const isValid = !(touched && error);
  const errorMessage = !isValid ? error : '';

  useFormikValidationFix(field.value);

  return (
    <FormGroup
      fieldId={fieldId}
      label={label}
      helperText={helpText}
      helperTextInvalid={errorMessage}
      isValid={isValid}
      isRequired={required}
    >
      <Dropdown
        {...props}
        id={fieldId}
        selectedKey={field.value}
        dropDownClassName={cx({ 'dropdown--full-width': props.fullWidth })}
        aria-describedby={`${fieldId}-helper`}
        onChange={(value: string) => {
          props.onChange && props.onChange(value);
          setFieldValue(props.name, value);
          setFieldTouched(props.name, true);
        }}
      />
    </FormGroup>
  );
};

export default DropdownField;
