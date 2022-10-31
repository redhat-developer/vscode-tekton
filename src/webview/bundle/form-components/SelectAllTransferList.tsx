/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { vscode } from '../index';
import { FormInputProps } from './FormInputProps';
import { Box } from '@mui/material';

const imageResource = {
  'Task': 'T',
  'ClusterTask': 'CT',
  'Pipeline': 'PL'
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function LimitTags({ setValue, getValue }: FormInputProps) {
  const options3 = vscode.getState().map((option) => {
    return {
      ...option
    };
  });

  return (
    <Autocomplete
      multiple
      limitTags={2}
      id="checkboxes-tags-demo"
      options={options3}
      groupBy={(option) => option.tektonType}
      getOptionLabel={(option: { tektonType: string; name: string; }) => option.name}
      getOptionDisabled={(options) => {
        console.log(getValue.length);
        if (getValue.length === 10) {
          return true;
        }
        return false;
      }}
      isOptionEqualToValue={(event, newValue) => {
        return event.name === newValue.name;
      }}
      renderOption={(props, option) => (
        <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
          <img
            loading="lazy"
            width="30"
            src={`https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/${imageResource[option.tektonType]}.png`}
            srcSet={`https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/${imageResource[option.tektonType]}.png`}
            alt=""
          />
          {option.name}
        </Box>
      )}
      onChange={(event, newValue) => {
        setValue(newValue);
      }}
      style={{ width: 500 }}
      renderInput={(params) => (
        <TextField
          required
          {...params}
          variant="outlined"
          label="Tekton Resources"
          placeholder="Tekton Resources"
        />
      )}
    />
  );
}
