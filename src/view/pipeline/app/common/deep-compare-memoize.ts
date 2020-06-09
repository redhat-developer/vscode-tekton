/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as React from 'react';
import * as _ from 'lodash';

export const useDeepCompareMemoize = <T = any>(value: T): T => {
  const ref = React.useRef<T>();

  if (!_.isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};
