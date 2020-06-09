/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as React from 'react';
import { TextInputTypes } from '@patternfly/react-core';
import InputField from '../components/InputField';

type PipelineImageOptionsProps = { prefixName: string };

const PipelineImageOptions: React.FC<PipelineImageOptionsProps> = ({ prefixName }) => (
  <InputField
    type={TextInputTypes.text}
    name={`${prefixName}.params.url`}
    label="URL"
    helpText="Please provide Image URL."
    required
  />
);

export default PipelineImageOptions;
