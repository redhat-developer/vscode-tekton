/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from 'react';
import TextField from '@mui/material/TextField';
import { vscode } from '../index';
import { FormInputProps } from './FormInputProps';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import styled from '@emotion/styled';
import Popper from '@mui/material/Popper';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { MyChip } from './customChip';

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: '2px',
    '& .MuiInputLabel-outlined.MuiInputLabel-shrink': {
      color: 'var(--vscode-keybindingLabel-foreground)'
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--vscode-contrastBorder)',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--vscode-focusBorder)',
    },
    '.css-1gywuxd-MuiInputBase-root-MuiOutlinedInput-root': {
      borderColor: 'var(--vscode-focusBorder)',
    },
  },
}));

const StyledPopper = styled(Popper)(({ theme }) => ({
  '& .MuiAutocomplete-groupLabel': {
    backgroundColor: 'var(--vscode-dropdown-background)',
    color: 'var(--vscode-foreground)',
  },
  '& .MuiAutocomplete-paper': {
    backgroundColor: 'var(--vscode-dropdown-background)',
    color: 'var(--vscode-foreground)',
  }
}));


const imageResource = {
  'Task': 'T',
  'ClusterTask': 'CT',
  'Pipeline': 'PL'
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function LimitTags({ setValue, getValue }: FormInputProps) {
  const classes = useStyles();
  const options3 = vscode.getState().map((option) => {
    return {
      ...option
    };
  });

  return (
    <Autocomplete
      PopperComponent={StyledPopper}
      classes={classes}
      multiple
      limitTags={2}
      style={{
        fontFamily: 'var(--vscode-editor-font-family)',
        width: 500
      }}
      id="checkboxes-tags-demo"
      options={options3}
      groupBy={(option) => option.tektonType}
      getOptionLabel={(option: { tektonType: string; name: string; }) => option.name}
      getOptionDisabled={(options) => {
        console.log(getValue.length);
        if (getValue.length === 10) {
          return true;
        }
        return false;
      }}
      isOptionEqualToValue={(event, newValue) => {
        return event.name === newValue.name;
      }}
      renderOption={(props, option) => (
        <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
          <img
            loading="lazy"
            width="30"
            src={`https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/${imageResource[option.tektonType]}.png`}
            srcSet={`https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/${imageResource[option.tektonType]}.png`}
            alt=""
          />
          {option.name}
        </Box>
      )}
      onChange={(event, newValue) => {
        setValue(newValue);
      }}
      renderTags={(tagValue, getTagProps) => {
        return tagValue.map((option, index) => (
          <MyChip {...getTagProps({ index })} label={option.name} />
        ));
      }}
      renderInput={(params) => (
        <TextField
          required
          {...params}
          variant="outlined"
          label="Tekton Resources"
          InputLabelProps={{
            sx: { color: 'var(--vscode-disabledForeground)' }
          }}
        />
      )}
    />
  );
}
