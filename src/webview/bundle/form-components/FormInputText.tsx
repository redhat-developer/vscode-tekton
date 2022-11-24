/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { FormInputProps } from './FormInputProps';
import { InputLabel, TextField } from '@mui/material';
import { inputLabel } from '../Form';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function FormInputText({label, setValue, placeHolder, fieldType }: FormInputProps) {
  return (
    <div>
      <InputLabel htmlFor='bootstrap-input'
        style={{
          color: 'var(--vscode-settings-textInputForeground)'
        }}>
        {label}
      </InputLabel>
      <TextField
        id='bootstrap-input'
        size='small'
        sx={{
          '& .MuiOutlinedInput-root': {
            '& > fieldset': { borderColor: 'var(--vscode-contrastBorder)' },
          },
          '& .MuiOutlinedInput-root:hover': {
            '& > fieldset': {
              borderColor: 'var(--vscode-contrastBorder)'
            }
          }, 
          '& .MuiOutlinedInput-root.Mui-focused': {
            '& > fieldset': {
              borderColor: 'var(--vscode-contrastBorder)'
            }
          },
          input: {
            color: 'var(--vscode-settings-textInputForeground)',
            backgroundColor: 'var(--vscode-settings-textInputBackground)',
            borderRadius: '4px'
          }
        }}
        type={fieldType}
        placeholder={placeHolder}
        onChange={(text) => {
          if (label === inputLabel.image) {
            return setValue(text.target.value.trim());
          }
          if (label === inputLabel.password) {
            return setValue(text.target.value.trim());
          }
          if (label === inputLabel.userName) {
            return setValue(text.target.value.trim());
          }
        }}
        style={{ width: '500px', paddingTop: '10px', paddingBottom: '10px' }}
      />
    </div>
  );
}
