/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as React from 'react';
import { TextInputTypes } from '@patternfly/react-core';
import InputField from '../components/InputField';

type PipelineGitOptionsProps = { prefixName: string };

const PipelineGitOptions: React.FC<PipelineGitOptionsProps> = ({ prefixName }) => (
  <>
    <InputField
      type={TextInputTypes.text}
      name={`${prefixName}.params.url`}
      label="URL"
      helpText="Please provide git URL."
      required
    />
    <InputField
      type={TextInputTypes.text}
      name={`${prefixName}.params.revision`}
      label="Revision"
      helpText="Please provide Revisions. i.e master"
    />
  </>
);

export default PipelineGitOptions;
