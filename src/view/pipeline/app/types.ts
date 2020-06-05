/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { FormikValues } from 'formik';

export type PipelineModalFormResource = {
  name: string;
  selection: string;
  data: {
    type: string;
    params: { [key: string]: string };
    secrets?: { [key: string]: string };
  };
};

export interface Param {
  name: string;
}

export interface PipelineParam extends Param {
  default?: string | string[];
  description?: string;
}

export type CommonPipelineModalFormikValues = FormikValues & {
  namespace: string;
  parameters: PipelineParam[];
  resources: PipelineModalFormResource[];
};

export interface PipelineWorkspace extends Param {
  type: string;
  data?: {
    [key: string]: string;
  };
}

export type StartPipelineFormValues = CommonPipelineModalFormikValues & {
  workspaces: PipelineWorkspace[];
  secretOpen: boolean;
}
