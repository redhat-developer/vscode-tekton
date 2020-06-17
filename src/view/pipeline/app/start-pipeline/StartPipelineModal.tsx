/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { Formik } from 'formik';
import { StartPipelineFormValues } from './types';
import { convertPipelineToModalData } from '../common/utils';
import { PipelineWorkspace, Pipeline } from '../utils/pipeline-augment';
import { startPipelineSchema } from '../modals/validation-utils';
import ModalStructure from '../common/ModalStructure';
import StartPipelineForm from './StartPipelineForm';

const resource = (window as any).cmdText;
const pipeline: Pipeline = JSON.parse(resource).pipeline;


// eslint-disable-next-line @typescript-eslint/explicit-function-return-type

export default function Header() {
  // const userStartedLabel = useUserLabelForManualStart();

  const initialValues: StartPipelineFormValues = {
    ...convertPipelineToModalData(pipeline),
    workspaces: (pipeline.spec.workspaces || []).map((workspace: PipelineWorkspace) => ({
      ...workspace,
      type: 'EmptyDirectory',
    })),
    secretOpen: false,
  };

  const handleSubmit = (values: StartPipelineFormValues, actions): void => {
    actions.setSubmitting(true);

    // submitStartPipeline(values, pipeline, userStartedLabel)
    //   .then((res) => {
    //     actions.setSubmitting(false);
    //     onSubmit && onSubmit(res);
    //     close();
    //   })
    //   .catch((err) => {
    //     actions.setSubmitting(false);
    //     actions.setStatus({ submitError: err.message });
    //     errorModal({ error: err.message });
    //     close();
    //   });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={startPipelineSchema}
    >
      {(props) => (
        <ModalStructure submitBtnText="Start" title="Start Pipeline" close={close} {...props}>
          <StartPipelineForm {...props} />
        </ModalStructure>
      )}
    </Formik>
  );
}
