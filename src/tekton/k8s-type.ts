/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { PipelineRunResource, Workspace, TknParams, TknResource, TknWorkspaces } from '../tekton';
import { ObjectMetadata } from './triggertype';

export type K8sKind = {
  abbr?: string;
  kind: string;
  label?: string;
  labelPlural?: string;
  plural?: string;
  propagationPolicy?: 'Foreground' | 'Background';

  id?: string;
  crd?: boolean;
  apiVersion: string;
  apiGroup?: string;
  namespaced?: boolean;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  shortNames?: string[];
  // Legacy option for supporing plural names in URL paths when `crd: true`.
  // This should not be set for new models, but is needed to avoid breaking
  // existing links as we transition to using the API group in URL paths.
  legacyPluralURL?: boolean;
};

export type RouteTarget = {
  kind: 'Service';
  name: string;
  weight: number;
};

export type RouteTLS = {
  caCertificate?: string;
  certificate?: string;
  destinationCACertificate?: string;
  insecureEdgeTerminationPolicy?: string;
  key?: string;
  termination: string;
};

export type K8sResourceCondition = {
  type: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export type RouteIngress = {
  conditions: K8sResourceCondition[];
  host?: string;
  routerCanonicalHostname?: string;
  routerName?: string;
  wildcardPolicy?: string;
};

export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata?: ObjectMetadata;
};

export interface RouteKind extends K8sResourceCommon {
  spec: {
    alternateBackends?: RouteTarget[];
    host?: string;
    path?: string;
    port?: {
      targetPort: number | string;
    };
    subdomain?: string;
    tls?: RouteTLS;
    to: RouteTarget;
    wildcardPolicy?: string;
  };
  status?: {
    ingress: RouteIngress[];
  };
}

export interface PipelineSpec {
  params?: TknParams[];
  resources?: TknResource[];
  serviceAccountName?: string;
  workspaces?: TknWorkspaces[];
}

export interface PipelineRunKind extends K8sResourceCommon {
  spec: {
    pipelineRef?: { name: string };
    pipelineSpec?: PipelineSpec;
    params?: TknParams[];
    workspaces?: Workspace[];
    resources?: PipelineRunResource[];
    serviceAccountName?: string;
  };
}
