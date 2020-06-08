/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { FormikValues } from 'formik';
import PipelineParameterSection from './PipelineParameterSection';

const StartPipelineForm: React.FC<FormikValues> = ({ values }) => {
  return (
    <>
      <PipelineParameterSection parameters={values.parameters} />
      {/* <PipelineResourceSection /> */}
      {/* <PipelineWorkspacesSection />
      <FormSection title="Advanced Options" fullWidth>
        <PipelineSecretSection namespace={values.namespace} />
      </FormSection> */}
    </>
  );
};
  
export default StartPipelineForm;
