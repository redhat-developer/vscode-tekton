/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from 'react';
import { vscode } from '../index';
import { FormInputProps } from './FormInputProps';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import styled from '@emotion/styled';
import Popper from '@mui/material/Popper';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { MyChip } from './customChip';
import { InputLabel, TextField } from '@mui/material';
import '../index.css';

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: '2px',
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
    '.css-1gywuxd-MuiInputBase-root-MuiOutlinedInput-root': {
      borderColor: 'var(--vscode-contrastBorder)',
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
    transform: 'translate(1px, -1px)',
    position: 'absolute',
    width: '500px'
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
    <div>
      <InputLabel htmlFor='bootstrap-input'
        style={{
          color: 'var(--vscode-settings-textInputForeground)'
        }}>
        Tekton Resources
      </InputLabel>
      <div style={{ paddingTop: '10px', paddingBottom: '10px' }}>
        <Autocomplete
          PopperComponent={StyledPopper}
          disableCloseOnSelect
          filterSelectedOptions={ true }
          classes={classes}
          multiple
          limitTags={2}
          style={{
            fontFamily: 'var(--vscode-editor-font-family)',
            color: 'var(--vscode-settings-textInputForeground)',
            backgroundColor: 'var(--vscode-settings-textInputBackground)',
            width: '500px',
            borderRadius: '4px'
          }}
          id="checkboxes-tags-demo"
          options={options3}
          groupBy={(option) => option.tektonType}
          getOptionLabel={(option: { tektonType: string; name: string; }) => option.name}
          getOptionDisabled={(options) => {
            if (getValue.length === 10) {
              return true;
            }
            return false;
          }}
          isOptionEqualToValue={(event, newValue) => {
            return (event.name === newValue.name && event.tektonType === newValue.tektonType);
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
          size="small"
          renderInput={(params) => (
            <TextField
              required
              {...params}
              variant="outlined"
              style={{ width: '100%' }}
              InputLabelProps={{
                sx: { color: 'var(--vscode-disabledForeground)' }
              }}
            />
          )}
        />
      </div>
    </div>
  );
}
