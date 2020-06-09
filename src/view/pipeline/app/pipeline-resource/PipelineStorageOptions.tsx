/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { TextInputTypes } from '@patternfly/react-core';
import InputField from '../components/InputField';

type PipelineStorageOptionsProps = { prefixName: string };

const PipelineStorageOptions: React.FC<PipelineStorageOptionsProps> = ({ prefixName }) => (
  <>
    <InputField
      type={TextInputTypes.text}
      name={`${prefixName}.params.type`}
      label="Type"
      helpText="Represents the type of blob storage i.e gcs"
      required
    />
    <InputField
      type={TextInputTypes.text}
      name={`${prefixName}.params.location`}
      label="Location"
      helpText="Represents the location of the blob storage i.e gs://some-private-bucket"
      required
    />
    <InputField
      type={TextInputTypes.text}
      name={`${prefixName}.params.dir`}
      label="Directory"
      helpText="Represents whether the blob storage is a directory or not"
    />
  </>
);

export default PipelineStorageOptions;
