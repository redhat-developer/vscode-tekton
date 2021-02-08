/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { getTelemetryService, TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';

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

export default async function sendTelemetry(actionName: string, properties?: TelemetryProperties): Promise<void> {
  const service = await getTelemetryServiceInstance();
  if (actionName === 'activation') {
    return service?.sendStartupEvent();
  }
  return service?.send(createTrackingEvent(actionName, properties));
}
