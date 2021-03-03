/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { getTelemetryService, TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { getStderrString } from './util/stderrstring';

export interface TelemetryProperties {
  identifier?: string;
  version?: string;
  duration?: string;
  runtime?: string;
  error?: string;
  runtimeversion?: string;
  mission?: string;
}

const telemetryService: Promise<TelemetryService> = getTelemetryService('redhat.vscode-tekton-pipelines');

export function telemetryProperties(commandId: string): TelemetryProperties {
  return {
    identifier: commandId,
  }
}

export async function telemetryLogError(commandId: string, result: string | Error): Promise<void> {
  if (commandId) {
    const telemetryProps: TelemetryProperties = telemetryProperties(`${commandId}_error`);
    let message = getStderrString(result);
    const clusterInfo = /lookup\s+([^']+):/;
    if (clusterInfo.test(message)) {
      message = message.replace(clusterInfo, 'lookup cluster info: ');
    }
    const urlCheck = /(https?:\/\/[^\s]+)/g;
    if (urlCheck.test(message)) {
      message = message.replace(urlCheck, 'cluster info');
    }
    telemetryProps.error = message;
    sendTelemetry(`${commandId}_error`, telemetryProps);
  }
}

export async function getTelemetryServiceInstance(): Promise<TelemetryService> {
  return telemetryService;
}

export function createTrackingEvent(name: string, properties = {}): TelemetryEvent {
  return {
    type: 'track',
    name,
    properties
  }
}

export function telemetryLogCommand(commandId: string, message?: string): void {
  if (commandId) {
    const telemetryProps: TelemetryProperties = telemetryProperties(commandId);
    if (message) telemetryProps['message'] = message;
    sendTelemetry(commandId, telemetryProps);
  }
} 

export default async function sendTelemetry(actionName: string, properties?: TelemetryProperties): Promise<void> {
  const service = await getTelemetryServiceInstance();
  if (actionName === 'activation') {
    return service?.sendStartupEvent();
  }
  return service?.send(createTrackingEvent(actionName, properties));
}
