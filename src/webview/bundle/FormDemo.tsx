/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { Button, Paper, Typography } from '@material-ui/core';
import { useForm } from 'react-hook-form';
import { FormInputText } from './form-components/FormInputText';
import * as React from 'react';
import { LimitTags } from './SelectAllTransferList';

interface IFormInput {
  textValue: string;
  radioValue: string;
  checkboxValue: string[];
  dateValue: Date;
  dropdownValue: string;
  sliderValue: number;
}

const defaultValues = {
  textValue: '',
  radioValue: '',
  checkboxValue: [],
  dateValue: new Date(),
  dropdownValue: '',
  sliderValue: 0,
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function FormDemo () {
  const methods = useForm<IFormInput>({ defaultValues: defaultValues });
  const { handleSubmit, reset, control, setValue, watch } = methods;
  const onSubmit = (data: IFormInput) => console.log(data);
  const [btnDisabled, setBtnDisabled] = React.useState(false);


  return (
    <Paper
      style={{
        display: 'grid',
        gridRowGap: '20px',
        padding: '20px',
        margin: '10px 300px',
        position: 'absolute'
      }}
    >
      <Typography variant="h6"> Create Bundle</Typography>

      <FormInputText name="textValue" control={control} label="Image Name" />
      <LimitTags/>
      <Button onClick={handleSubmit(onSubmit)} variant={'contained'}>
        {' '}
        Submit{' '}
      </Button>
    </Paper>
  );
}
