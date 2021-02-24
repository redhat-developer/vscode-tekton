/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { getTelemetryService, TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { getStderrString } from './tkn';

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

export function telemetryError(commandId: string, result: string | Error): void {
  if (commandId) {
    const telemetryProps: TelemetryProperties = telemetryProperties(commandId);
    telemetryProps.error = getStderrString(result);
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

export function sendCommandContentToTelemetry(commandId: string, message?: string): void {
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
