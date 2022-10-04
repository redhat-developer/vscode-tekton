/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { ViewColumn } from 'vscode';
import { BuildWizard } from '../pipeline/bundle';



export function bundleWizard(): void {
  BuildWizard.create({}, ViewColumn.Active);
}
