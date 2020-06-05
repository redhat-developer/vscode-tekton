/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export const CREATE_PIPELINE_RESOURCE = '#CREATE_PIPELINE_RESOURCE#';


export enum PipelineResourceType {
  git = 'git',
  image = 'image',
  cluster = 'cluster',
  storage = 'storage',
}

export const initialResourceFormValues = {
  [PipelineResourceType.git]: {
    params: {
      url: '',
      revision: '',
    },
  },
  [PipelineResourceType.image]: {
    params: {
      url: '',
    },
  },
  [PipelineResourceType.storage]: {
    params: {
      type: '',
      location: '',
      dir: '',
    },
  },
  [PipelineResourceType.cluster]: {
    params: {
      name: '',
      url: '',
      username: '',
      password: '',
      insecure: '',
    },
    secrets: {
      cadata: '',
      token: '',
    },
  },
};
