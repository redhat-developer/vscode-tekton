/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as hubApi from '../tekton-hub-client';
import * as vscode from 'vscode';

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
    const hubUrl = vscode.workspace.getConfiguration('vs-tekton').get<string>('tekton-hub-url');
    const result = await new hubApi.StatusApi({basePath: hubUrl}).statusStatus();
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
    const resApi = createResourceApi();
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
  const restApi = createResourceApi();
  const result = await restApi.resourceVersionsByID(id);
  return result.data.data;
}

export async function getTaskByVersion(taskId: number): Promise<hubApi.ResourceVersionData> {
  const restApi = createResourceApi();
  const result = await restApi.resourceByVersionId(taskId);
  return result.data.data;
}

export async function getTaskByNameAndVersion(catalog: string, name: string, version: string): Promise<hubApi.ResourceVersionData> {
  const restApi = createResourceApi();
  const result = await restApi.resourceByCatalogKindNameVersion(catalog, 'task', name, version);
  return result.data.data;
}

export async function getTaskById(taskId: number): Promise<hubApi.ResourceData> {
  const restApi = createResourceApi();
  const result = await restApi.resourceById(taskId);
  return result.data.data;
}

export async function getTopRatedTasks(limit: number): Promise<hubApi.ResourceData[]> {
  const restApi = createResourceApi();
  const result = await restApi.resourceList(limit);
  return result.data.data;
}

function createResourceApi(): hubApi.ResourceApi {
  const hubUrl = vscode.workspace.getConfiguration('vs-tekton').get<string>('tekton-hub-url');
  return new hubApi.ResourceApi({basePath: hubUrl});
}
