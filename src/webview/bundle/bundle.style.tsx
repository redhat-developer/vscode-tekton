/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

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
      }
    },
    button: {
      whiteSpace: 'nowrap',
      display: 'inline-block',
      backgroundColor: 'var(--vscode-button-background)',
      background: 'var(--vscode-button-background)',
      color: 'var(--vscode-button-foreground)',
      border: '1px solid var(--vscode-activityBar-border)',
      '&:hover' :{
        color: 'var(--vscode-button-foreground)',
        backgroundColor: 'var(--vscode-button-hoverBackground)',
        cursor: 'pointer',
      },
      '&:focus': {
        backgroundColor: 'var(--vscode-button-hoverBackground)',
        cursor: 'pointer',
      },
      '&:disabled' :{
        color: 'var(--vscode-disabledForeground)',
        opacity: '0.6',
        border: '1px solid',
        background: 'var(--vscode-button-background)',
      },
    },
    inputLabel: {
      '&.shrink': {
        color: 'var(--vscode-keybindingLabel-foreground)'
      }
    }
  })
