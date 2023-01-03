/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { commands, TreeItemCollapsibleState } from 'vscode';
import { CliExitData } from '../cli';
import { Command } from '../cli-command';
import { IS_TEKTON_CLUSTER_INACTIVE, IS_TEKTON_PIPELINES_INACTIVE } from '../constants';
import { ContextType } from '../context-type';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { tkn } from '../tkn';
import { TektonNode, TektonNodeImpl } from '../tree-view/tekton-node';
import { clusterPipelineStatus } from './map-object';
import { getStderrString } from './stderrstring';
import { watchTektonResources } from './telemetry-watch-tekton-resource';
import { watchResources } from './watchResources';

export async function checkClusterStatus(extensionStartUpCheck?: boolean): Promise<TektonNode[]> {
  const result: CliExitData = await tkn.execute(
    Command.checkTekton(), process.cwd(), false
  );
  if (result.stdout.trim() === 'no') {
    return buildErrorNode(
      'The current user doesn\'t have the privileges to interact with tekton resources.',
      'tekton_resource_privileges',
      extensionStartUpCheck
    );
  }
  if (result.error && getStderrString(result.error).indexOf('You must be logged in to the server (Unauthorized)') > -1) {
    return buildErrorNode(
      'Please login to the server.',
      'tekton_login',
      extensionStartUpCheck
    );
  }
  const serverCheck = RegExp('Unable to connect to the server|The connection to the server localhost:8080 was refused');
  if (serverCheck.test(getStderrString(result.error))) {
    disableWatchAndLogErrorTelemetry(
      'Unable to connect to OpenShift cluster, is it down?',
      'problem_connect_cluster',
      extensionStartUpCheck
    );
    setPipelinesStatus(true, true);
    commands.executeCommand('setContext', 'tekton.pipeline', false);
    commands.executeCommand('setContext', 'tekton.cluster', true);
    return [];
  }
  if (result.error && getStderrString(result.error).indexOf('the server doesn\'t have a resource type \'pipeline\'') > -1) {
    disableWatchAndLogTelemetry(
      'Please install the Pipelines Operator.',
      'install_pipeline_operator',
      extensionStartUpCheck
    );
    setPipelinesStatus(false, true);
    commands.executeCommand('setContext', 'tekton.cluster', false);
    commands.executeCommand('setContext', 'tekton.pipeline', true);
    return [];
  }
  setPipelinesStatus(false, false);
  await watchTektonResources(extensionStartUpCheck);
  return null;
}

function setPipelinesStatus(isClusterInactive: boolean, isPipelinesInactive: boolean): void {
  clusterPipelineStatus.set(IS_TEKTON_CLUSTER_INACTIVE, isClusterInactive);
  clusterPipelineStatus.set(IS_TEKTON_PIPELINES_INACTIVE, isPipelinesInactive);
}

function disableWatchAndLogErrorTelemetry(message: string, identifier: string, extensionStartUpCheck?: boolean): void {
  watchResources.disableWatch();
  if (extensionStartUpCheck) {
    telemetryLogError(`${identifier}_startUp`, message);
    return;
  }
  telemetryLogError(identifier, message);
}

function disableWatchAndLogTelemetry(message: string, identifier: string, extensionStartUpCheck?: boolean): void {
  watchResources.disableWatch();
  if (extensionStartUpCheck) {
    telemetryLog(`${identifier}_startUp`, message);
    return;
  }
  telemetryLog(identifier, message);
}

function buildErrorNode(message: string, identifier: string, extensionStartUpCheck?: boolean): (TektonNode[] | undefined) {
  disableWatchAndLogTelemetry(message, identifier, extensionStartUpCheck);
  if (extensionStartUpCheck) {
    return undefined;
  }
  return [new TektonNodeImpl(null, message, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)];
}
