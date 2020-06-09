/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


export const getFieldId = (fieldName: string, fieldType: string) => {
  return `form-${fieldType}-${fieldName?.replace(/\./g, '-')}-field`;
};
