/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as _ from 'lodash-es';
import * as React from 'react';
import * as classNames from 'classnames';

type LoadingProps = {
  className?: string;
};

export const Loading: React.FC<LoadingProps> = ({ className }) => (
  <div className={classNames('co-m-loader co-an-fade-in-out', className)}>
    <div className="co-m-loader-dot__one" />
    <div className="co-m-loader-dot__two" />
    <div className="co-m-loader-dot__three" />
  </div>
);
Loading.displayName = 'Loading';

export const LoadingInline: React.FC<{}> = () => <Loading className="co-m-loader--inline" />;
LoadingInline.displayName = 'LoadingInline';
