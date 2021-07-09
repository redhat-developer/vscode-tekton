/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ProjectType } from '../project-types';
import {detectLanguages} from '@redhat-developer/alizer';

export async function getProjectType(path: string): Promise<ProjectType[]> {
  const result = await detectLanguages(path);
  return result;
}
