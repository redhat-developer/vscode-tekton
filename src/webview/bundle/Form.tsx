/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { Button, Paper, Typography } from '@material-ui/core';
import { useForm } from 'react-hook-form';
import { FormInputText } from './form-components/FormInputText';
import * as React from 'react';
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


// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function Form () {
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
          // position: 'absolute'
        }}
      >
        <Typography variant="h6"> Create Bundle</Typography>

        <FormInputText label="Image Name" setValue={setImage} />
        <LimitTags setValue={setResource} getValue={resource}/>
        <Button onClick={handleSubmit(onSubmit)} variant={'contained'} disabled={!image || resource.length === 0}>
          {' '}
          Submit{' '}
        </Button>
      </Paper>
    </div>
  );
}
