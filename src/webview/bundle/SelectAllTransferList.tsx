/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { vscode } from './index';

export function LimitTags() {
  const filterOptions = createFilterOptions({
    matchFrom: 'any',
    stringify: (option: any) => `${option.relationship} ${option.companyName}`
  });

  const options3 = vscode.getState().map((option) => {
    return {
      ...option
    };
  });

  return (
    <Autocomplete
      filterOptions={filterOptions}
      // value={selectedOptions}
      multiple
      limitTags={2}
      id="checkboxes-tags-demo"
      options={options3}
      groupBy={(option) => option.tektonType}
      getOptionLabel={(option) => option.name}
      // getOptionDisabled={(options) => {
      //   debugger
      //   return false
      // }}
      style={{ width: 500 }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label="Tekton Resources"
          placeholder="Tekton Resources"
        />
      )}
    />
  );
}
