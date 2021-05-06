/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { commands, TreeItemCollapsibleState } from 'vscode';
import { CliExitData } from '../cli';
import { Command } from '../cli-command';
import { ContextType } from '../context-type';
import { telemetryLog, telemetryLogError } from '../telemetry';
import { tkn } from '../tkn';
import { TektonNode, TektonNodeImpl } from '../tree-view/tekton-node';
import { getStderrString } from './stderrstring';
import { watchTektonResources } from './telemetry-watch-tekton-resource';
import { watchResources } from './watchResources';

export async function checkClusterStatus(extensionStartUpCheck?: boolean): Promise<TektonNode[]> {
  const result: CliExitData = await tkn.execute(
    Command.checkTekton(), process.cwd(), false
  );
  const kubectlCheck = RegExp('kubectl:\\s*command not found');
  if (kubectlCheck.test(getStderrString(result.error))) {
    const tknMessage = 'Please install kubectl.';
    watchResources.disableWatch();
    if (extensionStartUpCheck) {
      telemetryLog('kubeclt_not_found', tknMessage);
      return;
    }
    telemetryLog('kubeclt_not_found', tknMessage);
    return [new TektonNodeImpl(null, tknMessage, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)]
  }
  if (result.stdout.trim() === 'no') {
    const tknPrivilegeMsg = 'The current user doesn\'t have the privileges to interact with tekton resources.';
    const identifier = 'tekton_resource_privileges';
    watchResources.disableWatch();
    if (extensionStartUpCheck) {
      telemetryLog(`${identifier}_startUp`, tknPrivilegeMsg);
      return;
    }
    telemetryLog(identifier, tknPrivilegeMsg);
    return [new TektonNodeImpl(null, tknPrivilegeMsg, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)];
  }
  if (result.error && getStderrString(result.error).indexOf('You must be logged in to the server (Unauthorized)') > -1) {
    const tknMessage = 'Please login to the server.';
    const identifier = 'tekton_login';
    watchResources.disableWatch();
    if (extensionStartUpCheck) {
      telemetryLog(`${identifier}_startUp`, tknMessage);
      return;
    }
    telemetryLog(identifier, tknMessage);
    return [new TektonNodeImpl(null, tknMessage, ContextType.TKN_DOWN, this, TreeItemCollapsibleState.None)]
  }
  const serverCheck = RegExp('Unable to connect to the server');
  if (serverCheck.test(getStderrString(result.error))) {
    const loginError = 'Unable to connect to OpenShift cluster, is it down?';
    const identifier = 'problem_connect_cluster';
    watchResources.disableWatch();
    if (extensionStartUpCheck) {
      telemetryLogError(`${identifier}_startUp`, loginError);
      return;
    }
    telemetryLogError(identifier, loginError);
    commands.executeCommand('setContext', 'tekton.pipeline', false);
    commands.executeCommand('setContext', 'tekton.cluster', true);
    return [];
  }
  if (result.error && getStderrString(result.error).indexOf('the server doesn\'t have a resource type \'pipeline\'') > -1) {
    const message = 'Please install the Pipelines Operator.';
    const identifier = 'install_pipeline_operator';
    watchResources.disableWatch();
    if (extensionStartUpCheck) {
      telemetryLog(`${identifier}_startUp`, message);
      return;
    }
    telemetryLog(identifier, message);
    commands.executeCommand('setContext', 'tekton.cluster', false);
    commands.executeCommand('setContext', 'tekton.pipeline', true);
    return [];
  }
  await watchTektonResources(extensionStartUpCheck);
  return null;
}
