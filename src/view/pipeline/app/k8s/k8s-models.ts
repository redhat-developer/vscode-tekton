/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Map as ImmutableMap } from 'immutable';
import * as _ from 'lodash-es';
import { K8sResourceKindReference, GroupVersionKind } from '../utils/resource-icon';
import { K8sKind } from './type';
import * as staticModels from '../modals';
import { referenceForModel } from './k8s';


export const isGroupVersionKind = (ref: GroupVersionKind | string) => ref.split('~').length === 3;


export const kindForReference = (ref: K8sResourceKindReference) =>
  isGroupVersionKind(ref) ? ref.split('~')[2] : ref;

const modelKey = (model: K8sKind): string => {
  // TODO: Use `referenceForModel` even for known API objects
  return model.crd ? referenceForModel(model) : model.kind;
};

export const modelsToMap = (models: K8sKind[]): ImmutableMap<K8sResourceKindReference, K8sKind> => {
  return ImmutableMap<K8sResourceKindReference, K8sKind>().withMutations((map) => {
    models.forEach((model) => map.set(modelKey(model), model));
  });
};

const k8sModels = modelsToMap(_.values(staticModels))

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const modelFor = (ref: any) => {
  let m = k8sModels.get(ref);
  if (m) {
    return m;
  }
  m = k8sModels.get(kindForReference(ref));
  if (m) {
    return m;
  }
};
