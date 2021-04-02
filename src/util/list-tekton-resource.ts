/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { cli } from '../cli';
import { Command } from '../cli-command';
import { TknPipeline } from '../tekton';

export async function getPipelineList(): Promise<TknPipeline[]> {
  const result = await cli.execute(Command.listPipelines());
  let data: TknPipeline[] = [];
  try {
    const r = JSON.parse(result.stdout);
    data = r.items ? r.items : data;
  } catch (ignore) {
    // ignore
  }
  return data;
}
