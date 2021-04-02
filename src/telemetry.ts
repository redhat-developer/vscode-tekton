/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { getTelemetryService, TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { hideClusterInfo } from './util/hideclusterinformation';
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

export async function telemetryLogError(identifier: string, result: string | Error): Promise<void> {
  if (identifier) {
    const telemetryProps: TelemetryProperties = telemetryProperties(`${identifier}_error`);
    const message = getStderrString(result);
    telemetryProps.error = hideClusterInfo(message);
    sendTelemetry(`${identifier}_error`, telemetryProps);
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

export function telemetryLog(identifier: string, message?: string): void {
  if (identifier) {
    const telemetryProps: TelemetryProperties = telemetryProperties(identifier);
    if (message) telemetryProps['message'] = message;
    sendTelemetry(identifier, telemetryProps);
  }
} 

export default async function sendTelemetry(actionName: string, properties?: TelemetryProperties): Promise<void> {
  const service = await getTelemetryServiceInstance();
  if (actionName === 'activation') {
    return service?.sendStartupEvent();
  }
  return service?.send(createTrackingEvent(actionName, properties));
}
