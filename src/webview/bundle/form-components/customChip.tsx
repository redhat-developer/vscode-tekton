/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import Chip from '@material-ui/core/Chip';  
import makeStyles from '@material-ui/core/styles/makeStyles';


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = makeStyles((theme) => ({
  label: {
    color: 'black',
  }
}));

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const MyChip = (props) => {
  const classes = useStyles();
  return (
    <Chip
      classes={{
        label: classes.label
      }} 
      size="small"
      {...props}
    />
  );
};
