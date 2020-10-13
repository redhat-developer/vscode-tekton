/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


export enum VolumeTypes {
  EmptyDirectory = 'Empty Directory',
  ConfigMap = 'Config Map',
  Secret = 'Secret',
  PersistentVolumeClaim = 'PVC',
}

export const initialResourceFormValues = {
  name: undefined,
  params: [],
  resources: [],
  workspaces: [],
  trigger: undefined,
  newPvc: []
}

export enum TknResourceType {
  Trigger = 'Webhook',
  Params = 'Parameters',
  GitResource = 'Git Resource',
  ImageResource = 'Image Resource',
  Workspaces = 'Workspaces',
}
  
export enum typeOfResource {
  git = 'git',
  image = 'image'
}

export enum workspaceResource {
  Secret = 'secret',
  ConfigMap = 'configMap',
  PersistentVolumeClaim = 'persistentVolumeClaim'
}

export enum workspaceResourceTypeName {
  Secret = 'secretName',
  ConfigMap = 'name',
  PersistentVolumeClaim = 'claimName'
}

export const accessMode = [
  {
    name: 'Single User (RWO)',
    value: 'ReadWriteOnce'
  },
  {
    name: 'Shared Access (RWX)',
    value: 'ReadWriteMany'
  },
  {
    name: 'Read Only (ROX)',
    value: 'ReadOnlyMany'
  }
]

export const size = [
  {
    name: 'MiB',
    value: 'Mi'
  },
  {
    name: 'GiB',
    value: 'Gi'
  },
  {
    name: 'TiB',
    value: 'Ti'
  }
];
