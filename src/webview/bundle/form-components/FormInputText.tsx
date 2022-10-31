/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import TextField from '@material-ui/core/TextField';
import { FormInputProps } from './FormInputProps';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function FormInputText({label, setValue }: FormInputProps) {
  return (
    <TextField
      fullWidth
      required
      placeholder='Use the schema registry/repository/image:version'
      onChange={(text) => {
        return setValue(text.target.value.trim());
      }}
      label={label}
      variant="outlined"
    />
  );
}
