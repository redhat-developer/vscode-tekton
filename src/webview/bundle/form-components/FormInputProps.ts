/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-explicit-any */


export interface FormInputProps {
    name?: string;
    control?: any;
    label?: string;
    setValue?: any;
    getValue?: any;
    placeHolder?: string;
    requiredField?: boolean;
    fieldType?: string;
}
