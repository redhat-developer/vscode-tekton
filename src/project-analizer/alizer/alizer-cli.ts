/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { cli, createCliCommand } from '../../cli';
import { ProjectType } from '../project-types';


export async function getProjectType(path: string): Promise<ProjectType[]> {
  // TODO: change this path
  const command = createCliCommand('/Users/yevhen/work/redhat/alizer/alizer-cli/target/alizer-cli-0.1.0-SNAPSHOT-runner', 'analyze', '-o', 'json', path);
  const cliResult = await cli.execute(command);
  if (cliResult.error) {
    throw cliResult.error;
  }

  try {
    const data = JSON.parse(cliResult.stdout);
    if (!data.success) {
      return [];
    }
    return data.languages;
  } catch (err) {
    console.error(err);
  }

}
