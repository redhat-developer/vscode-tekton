/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { cli, CliCommand } from '../cli';
import { Command } from '../cli-command';
import { TknPipeline } from '../tekton';

export async function getPipelineList(): Promise<TknPipeline[]> {
  return await executeCommand(Command.listPipelines());
}

export async function getResourceList(resource: string): Promise<TknPipeline[]> {
  return await executeCommand(Command.resourceList(resource));
}

async function executeCommand(command: CliCommand): Promise<TknPipeline[]> {
  const result = await cli.execute(command);
  let data: TknPipeline[] = [];
  try {
    const r = JSON.parse(result.stdout);
    data = r.items ? r.items : data;
  } catch (ignore) {
    // ignore
  }
  return data;
}
