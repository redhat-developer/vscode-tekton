/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { Button, Paper, Typography } from '@material-ui/core';
import { useForm } from 'react-hook-form';
import { FormInputText } from './form-components/FormInputText';
import * as React from 'react';
import { makeStyles } from '@mui/styles';
import { LimitTags } from './form-components/SelectAllTransferList';
import { vscode } from './index';

interface IFormInput {
  textValue: string;
  radioValue: string;
  checkboxValue: string[];
  dateValue: Date;
  dropdownValue: string;
  sliderValue: number;
}

const useStyles = makeStyles({
  root: {
    color: 'var(--vscode-button-foreground)',
    backgroundColor: 'var(--vscode-button-foreground)',
    '&:hover': {
      color: 'var(--vscode-button-foreground)',
      backgroundColor: '#BE0000',
    },
    textTransform: 'none'
  },
});



// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function Form () {
  const classes = useStyles();
  const methods = useForm<IFormInput>();
  const { handleSubmit} = methods;
  const [image, setImage] = React.useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resource, setResource]: any[] = React.useState([]);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const onSubmit = () => {
    vscode.postMessage({
      type: 'tekton_bundle',
      body: {imageDetail: image, resourceDetail: resource}
    });
  }

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // Change the size to fit the parent element of this div
        width: '100%',
        height: '100%',
      }}
    >
      <Paper
        style={{
          display: 'grid',
          gridRowGap: '20px',
          padding: '20px',
          margin: '190px 300px',
          border: '1px solid var(--vscode-settings-focusedRowBorder)',
          background: 'var(--vscode-editor-background)'
          // position: 'absolute'
        }}
      >
        <Typography variant="h6" style={{
          fontSize: '1.25rem',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          fontWeight: '500',
          lineHeight: '1.6',
          letterSpacing: '0.0075em',
          color: 'var(--vscode-foreground)'
        }}> Create Bundle</Typography>

        <FormInputText label="Image Name" setValue={setImage} />
        <LimitTags setValue={setResource} getValue={resource}/>
        <Button onClick={handleSubmit(onSubmit)} className={classes.root} variant={'contained'} disabled={!image || resource.length === 0}>
          {' '}
          Submit{' '}
        </Button>
      </Paper>
    </div>
  );
}
