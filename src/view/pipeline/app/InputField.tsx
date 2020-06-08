/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as React from 'react';
import { TextInput, TextInputTypes } from '@patternfly/react-core';
import { BaseInputFieldProps } from './field-types';
import BaseInputField from './BaseInputField';

const InputField: React.FC<BaseInputFieldProps> = ({
  type = TextInputTypes.text,
  ...baseProps
}) => (
  <BaseInputField type={type} {...baseProps}>
    {(props) => <TextInput {...props} />}
  </BaseInputField>
);
  
export default InputField;
