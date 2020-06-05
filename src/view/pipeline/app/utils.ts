/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { PipelineResource, Pipeline } from './pipeline-augment';
import { CommonPipelineModalFormikValues } from './types';
import { CREATE_PIPELINE_RESOURCE, initialResourceFormValues } from './const';

export const convertPipelineToModalData = (
  pipeline: Pipeline,
  alwaysCreateResources = false,
): CommonPipelineModalFormikValues => {
  const {
    metadata: { namespace },
    spec: { params, resources },
  } = pipeline;
  
  return {
    namespace,
    parameters: params || [],
    resources: (resources || []).map((resource: PipelineResource) => ({
      name: resource.name,
      selection: alwaysCreateResources ? CREATE_PIPELINE_RESOURCE : null,
      data: {
        ...initialResourceFormValues[resource.type],
        type: resource.type,
      },
    })),
  };
};
