/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import Chip from '@material-ui/core/Chip';  

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const MyChip = (props) => {

  return (
    <Chip
      {...props}
    />
  );
};
