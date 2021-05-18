/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { k8sCreate } from './addtrigger';


export interface NewPvc {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    generateName?: string;
  };
  spec: {
    accessMode: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    volumeMode: string;
  };
}

export interface NewPipelineResources {
  apiVersion: string;
  kind: string;
  metadata: {
    name?: string;
    generateName?: string;
  };
  spec: {
    params: [
      {
        name: string;
        value: string;
      }
    ];
    type: string;
  };
}

export async function createNewResource(resources: NewPvc[] | NewPipelineResources[]): Promise<boolean> {
  if (resources.length === 0) return null;
  for (const resource of resources) {
    await k8sCreate(resource);
  }
}
