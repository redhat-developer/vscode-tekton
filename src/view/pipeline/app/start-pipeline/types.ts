/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { CommonPipelineModalFormikValues } from '../common/types';
import { PipelineWorkspace } from '../utils/pipeline-augment';

export type StartPipelineFormValues = CommonPipelineModalFormikValues & {
  workspaces: PipelineWorkspace[];
  secretOpen: boolean;
};
