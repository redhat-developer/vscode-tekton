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

export async function createPvc(PersistentVolumeClaim: NewPvc[]): Promise<boolean> {
  if (PersistentVolumeClaim.length === 0) return null;
  for (const pvc of PersistentVolumeClaim) {
    await k8sCreate(pvc);
  }
}
