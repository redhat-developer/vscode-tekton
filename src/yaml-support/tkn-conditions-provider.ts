/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Command } from '../cli-command';
import { tkn } from '../tkn';


export async function getTknConditionsSnippets(): Promise<string[]> {
  const result = await tkn.execute(Command.listConditions());
  let data = [];
  if (result.error) {
    return [];
  }
  try {
    data = JSON.parse(result.stdout).items;
  } catch (ignore) {
    //show no pipelines if output is not correct json
  }

  let condition: string[] = data.map((value) => value.metadata.name);
  condition = [...new Set(condition)];
  return condition;
}
