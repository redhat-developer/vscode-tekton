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
      },
      '& .MuiButton-contained.Mui-disabled': {
        opacity: '0.4',
        backgroundColor: 'var(--vscode-button-background)',
      }
    },
    button: {
      whiteSpace: 'nowrap',
      display: 'inline-block',
      marginTop: theme.spacing(1),
      marginRight: theme.spacing(1),
      backgroundColor: 'var(--vscode-button-background)',
      color: 'var(--vscode-button-foreground)',
      '&:hover' :{
        color: 'var(--vscode-button-foreground)',
        backgroundColor: 'var(--vscode-button-hoverBackground)',
        cursor: 'pointer'
      },
      '&:focus': {
        backgroundColor: 'var(--vscode-button-hoverBackground)',
        cursor: 'pointer'
      },
      '&:disabled' :{
        opacity: 0.4
      }
    },

  })
