/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

//Contains set JSON representation of tkn JSON objects

export interface TknMetadata {
    name: string;
    generation: number;
    namespace: string;
    uid: string;
    resourceVersion: string;
}

export interface TknParams {
    name: string;
    value: string;
    default: string;
    description: string;
}

export interface TknResource {
    name: string;
    type: string;
}

export interface TknSpec {
    type: string;
    resources?: TknResource[];
    params?: TknParams[];
    serviceAccount?: string;
}

export interface TknTaskSpec {
    inputs: {};
    steps: [];
}


export interface TknPipelineTrigger {
    metadata: TknMetadata;
    spec: TknSpec;
}

export interface TknPipelineResource {
    metadata: TknMetadata;
    spec: TknSpec;
}

export interface TknTask {
    metadata: TknMetadata;
    spec: TknTaskSpec;
}
