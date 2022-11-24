/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import { Button, Typography } from '@material-ui/core';
import { useForm } from 'react-hook-form';
import { FormInputText } from './form-components/FormInputText';
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { LimitTags } from './form-components/SelectAllTransferList';
import { vscode } from './index';
import bundleStyle from './bundle.style';
import './style.scss';

interface IFormInput {
  textValue: string;
  radioValue: string;
  checkboxValue: string[];
  dateValue: Date;
  dropdownValue: string;
  sliderValue: number;
}

const useStyles = makeStyles(bundleStyle);

export const inputLabel: {image: string, userName: string, password: string } = {
  image: 'Image Name',
  userName: 'Username',
  password: 'Password'
}

const imageRegex = RegExp('[^/]+\\.[^/.]+\\/([^/.]+)(?:\\/[\\w\\s._-]*([\\w\\s._-]))*(?::[a-z0-9\\.-]+)?$');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateButton(image: string, username: string, password: string, resource: any[]): boolean {
  if (imageRegex.test(image.trim()) && resource.length !== 0 && username?.trim() === '' && password?.trim() === '') return false;
  if (imageRegex.test(image.trim()) && resource.length !== 0 && username?.trim() && password?.trim()) return false;
  return true;
}


// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function Form () {
  const classes = useStyles();
  const methods = useForm<IFormInput>();
  const { handleSubmit} = methods;
  const [image, setImage] = React.useState('');
  const [username, setUserName] = React.useState('');
  const [password, setPassword] = React.useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resource, setResource]: any[] = React.useState([]);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const onSubmit = () => {
    vscode.postMessage({
      type: 'tekton_bundle',
      body: {imageDetail: image, resourceDetail: resource, userDetail: username, passwordDetail: password}
    });
  }

  return (
    <div className='mainContainer margin' >
      <div className='title'>
        <Typography variant="h5" > Create Bundle</Typography>
      </div>
      <div className='subTitle'>
        <Typography>This workflow will help to create a bundle and push it to remote registry.</Typography>
      </div>
      <FormInputText label={inputLabel.image} setValue={setImage} placeHolder={'Use the schema registry/repository/image:version'} fieldType={'text'}/>
      <FormInputText label={inputLabel.userName} setValue={setUserName} placeHolder={'Provide username (optional if credentials are stored)'} fieldType={'text'}/>
      <FormInputText label={inputLabel.password} setValue={setPassword} placeHolder={'Provide password (optional if credentials are stored)'} fieldType={'password'}/>
      <LimitTags setValue={setResource} getValue={resource}/>
      <Button
        onClick={handleSubmit(onSubmit)}
        className={classes.button}
        variant={'contained'}
        disabled={validateButton(image, username, password, resource)}
        style={{ backgroundColor: '#EE0000', textTransform: 'none', color: 'white', width: 200, left: '4px' }}
      >
        {' '}
          Submit{' '}
      </Button>
    </div>
  );
}
