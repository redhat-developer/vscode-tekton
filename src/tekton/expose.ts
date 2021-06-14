/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonItem } from './tektonitem';
import { EventListenerKind } from '../tekton';
import { RouteKind, K8sKind } from './k8s-type';
import { apiVersionForModel, k8sCreate } from './addtrigger';
import { Command } from '../cli-command';
import { EventListenerModel } from '../util/resource-kind';

export const RouteModel: K8sKind = {
  label: 'Route',
  labelPlural: 'Routes',
  apiGroup: 'route.openshift.io',
  apiVersion: 'v1',
  kind: 'Route',
};

export async function exposeRoute(elName: string, commandId?: string): Promise<void> {
  const elResourceCli = await TektonItem.tkn.execute(Command.getEventListener(elName), process.cwd(), false);
  const elResource: EventListenerKind = JSON.parse(elResourceCli.stdout);
  const serviceGeneratedName = elResource?.status?.configuration.generatedName;
  const serviceResourceCli = await TektonItem.tkn.execute(Command.getService(serviceGeneratedName), process.cwd(), false);
  const serviceResource = JSON.parse(serviceResourceCli.stdout);
  const servicePort = serviceResource.spec?.ports?.[0]?.targetPort;
  const route: RouteKind = createEventListenerRoute(
    elResource,
    serviceGeneratedName,
    servicePort,
  );
  await k8sCreate(route, commandId);
}

export function createEventListenerRoute(eventListener: EventListenerKind, generatedName?: string, targetPort = 8080): RouteKind {
  const eventListenerName = eventListener.metadata.name;
  const referenceName = generatedName || `el-${eventListenerName}`;
  return {
    apiVersion: apiVersionForModel(RouteModel),
    kind: RouteModel.kind,
    metadata: {
      name: referenceName,
      labels: {
        'app.kubernetes.io/managed-by': EventListenerModel.kind,
        'app.kubernetes.io/part-of': 'Triggers',
        eventlistener: eventListenerName,
      },
    },
    spec: {
      port: {
        targetPort,
      },
      to: {
        kind: 'Service',
        name: referenceName,
        weight: 100,
      },
    },
  };
}
