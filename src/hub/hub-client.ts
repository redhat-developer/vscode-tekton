/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as hubApi from '../tekton-hub-client';

export enum TektonHubStatusEnum {
  Ok = 'ok',
  Error = 'error'
}

export interface TektonHubStatus {
  status: TektonHubStatusEnum;
  error?: string; 
}

export async function getTektonHubStatus(): Promise<TektonHubStatus> {
  try {
    const result = await new hubApi.StatusApi().statusStatus();
    for (const service of result.data.services) {
      if (service.status !== hubApi.HubServiceStatusEnum.Ok){
        return {status: TektonHubStatusEnum.Error, error: service.error};
      }
    }
    return {status: TektonHubStatusEnum.Ok};
  } catch (err) {
    return {status: TektonHubStatusEnum.Error, error: err.toString()};
  }


}

export async function searchTask(name: string): Promise<hubApi.ResourceData[]> {
  try {
    const resApi = new hubApi.ResourceApi();
    const result = await resApi.resourceQuery(name);
    return result.data.data;
  } catch (err) {
    if (err instanceof Error ){
      if (err.message.includes('Request failed with status code 404')){
        return [];
      }

      throw err;
    }
  }
}

export async function getVersions(id: number): Promise<hubApi.Versions> {
  const restApi = new hubApi.ResourceApi();
  const result = await restApi.resourceVersionsByID(id);
  return result.data.data;
}

export async function getTaskByVersion(taskId: number): Promise<hubApi.ResourceVersionData> {
  const restApi = new hubApi.ResourceApi();
  const result = await restApi.resourceByVersionId(taskId);
  return result.data.data;
}
