/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import * as classNames from 'classnames';
import * as _ from 'lodash-es';
import { modelFor } from '../k8s/k8s-models';
import { kindToAbbr } from '../k8s/get-resources';


const MEMO = {};

export type GroupVersionKind = string;

export type K8sResourceKindReference = GroupVersionKind | string;

export type ResourceIconProps = {
  className?: string;
  kind: K8sResourceKindReference;
};

export const ResourceIcon: React.SFC<ResourceIconProps> = ({ className, kind }) => {
  // if no kind, return null so an empty icon isn't rendered
  if (!kind) {
    return null;
  }
  const memoKey = className ? `${kind}/${className}` : kind;
  if (MEMO[memoKey]) {
    return MEMO[memoKey];
  }
  const kindObj = modelFor(kind);
  const kindStr = _.get(kindObj, 'kind', kind);
  const backgroundColor = _.get(kindObj, 'color', undefined);
  const klass = classNames(`co-m-resource-icon co-m-resource-${kindStr.toLowerCase()}`, className);
  const iconLabel = (kindObj && kindObj.abbr) || kindToAbbr(kindStr);

  const rendered = (
    <>
      <span className="sr-only">{kindStr}</span>
      <span className={klass} title={kindStr} style={{ backgroundColor }}>
        {iconLabel}
      </span>
    </>
  );
  if (kindObj) {
    MEMO[memoKey] = rendered;
  }

  return rendered;
};
