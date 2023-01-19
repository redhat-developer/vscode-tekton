/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import { CommandContext, setCommandContext } from '../commands';
import { TknVersion, version } from './tknversion';

export async function triggerDetection(): Promise<void> {
  setCommandContext(CommandContext.Trigger, false);
  const tknVersionType: TknVersion = await version();
  if (tknVersionType && tknVersionType.trigger !== 'unknown') {
    setCommandContext(CommandContext.Trigger, true);
  }
}
