/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Theme, createStyles } from '@material-ui/core/styles';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
export default (theme: Theme) =>
  createStyles({
    root: {
      '& .MuiFormLabel-root': {
        color: 'var(--vscode-disabledForeground)',
      },
    },
    button: {
      textAlign: 'center',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: 'var(--vscode-button-foreground)',
      '&:hover' :{
        backgroundColor: '\'#BE0000\' !important',
      },
      '&:focus': {
        backgroundColor: '\'#BE0000\' !important',
      },
      '&:disabled' :{
        opacity: '0.6',
        background: '\'#BE0000\' !important',
      },
    },
    inputLabel: {
      '&.shrink': {
        color: 'var(--vscode-keybindingLabel-foreground)'
      }
    },
    autocompleteLabel: {
      '& .MuiInputLabel-outlined:not(.MuiInputLabel-shrink)': {
        color: 'var(--vscode-keybindingLabel-foreground)'
      },
      '&.Mui-focused .MuiInputLabel-outlined': {
        color: 'var(--vscode-keybindingLabel-foreground)'
      }
    },
  })
