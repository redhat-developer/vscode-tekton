/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { useFormikContext, FormikValues } from 'formik';
import { useDeepCompareMemoize } from './deep-compare-memoize';

export const useFormikValidationFix = (value: any) => {
  const { validateForm } = useFormikContext<FormikValues>();
  const memoizedValue = useDeepCompareMemoize(value);

  React.useEffect(() => {
    validateForm();
  }, [memoizedValue, validateForm]);
};
