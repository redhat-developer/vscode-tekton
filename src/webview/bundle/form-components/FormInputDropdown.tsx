/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import { useFormContext, Controller } from 'react-hook-form';
import { FormInputProps } from './FormInputProps';

const options = [
  {
    label: 'Dropdown Option 1',
    value: '1',
  },
  {
    label: 'Dropdown Option 2',
    value: '2',
  },
];

export function FormInputDropdown({
  name,
  control,
  label,
}) {
  const generateSingleOptions = () => {
    return options.map((option: any) => {
      return (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      );
    });
  };

  return (
    <FormControl size={'small'}>
      <InputLabel>{label}</InputLabel>
      <Controller
        render={({ field: { onChange, value } }) => (
          <Select onChange={onChange} value={value}>
            {generateSingleOptions()}
          </Select>
        )}
        control={control}
        name={name}
      />
    </FormControl>
  );
}
