/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import TextField from '@material-ui/core/TextField';
import { FormInputProps } from './FormInputProps';
import { createTheme, makeStyles, MuiThemeProvider } from '@material-ui/core/styles';
import bundleStyle from '../bundle.style';

const useStyles = makeStyles(bundleStyle);

export const theme = createTheme({
  overrides: {
    MuiFormLabel: {
      root: {
        '&$focused': {
          color: 'var(--vscode-keybindingLabel-foreground)'
        }
      }
    },
    MuiOutlinedInput: {
      input: {
        color: 'var(--vscode-foreground)',
      },
      root: {
        borderRadius: '2px',
        '& $notchedOutline': {
          // background: 'var(--vscode-input-background)',
          borderColor: 'var(--vscode-contrastBorder)'
        },
        '&:hover $notchedOutline': {
          borderColor: 'var(--vscode-contrastBorder)'
        },
        '&$focused $notchedOutline': {
          borderColor: 'var(--vscode-focusBorder)'
        }
      }
    },
    MuiInputLabel: {
      outlined: {
        color: 'var(--vscode-disabledForeground)',
      }
    },
    MuiFormControl: {
      fullWidth: {
        background: 'var(--vscode-input-background)'
      }
    }
  }
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function FormInputText({label, setValue }: FormInputProps) {
  const classes = useStyles();
  return (
    <MuiThemeProvider theme={theme}>
      <TextField
        InputLabelProps={{
          classes: {
            root: classes.inputLabel,
            focused: 'focused',
            shrink: 'shrink'
          }
        }}
        fullWidth
        required
        placeholder='Use the schema registry/repository/image:version'
        onChange={(text) => {
          return setValue(text.target.value.trim());
        }}
        label={label}
        variant="outlined"
      />
    </MuiThemeProvider>
  );
}