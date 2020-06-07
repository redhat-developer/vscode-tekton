/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import * as _ from 'lodash-es';
import { FormikProps, FormikValues } from 'formik';
import { Form } from '@patternfly/react-core';
import { ModalTitle, ModalBody, ModalSubmitFooter } from './modal';

export type ModalComponentProps = {
  cancel?: () => void;
  close?: () => void;
};

type ModalStructureProps = {
  children: React.ReactNode;
  submitBtnText: string;
  submitDanger?: boolean;
  title: string;
};

type ModalStructureCombinedProps = FormikProps<FormikValues> &
  ModalComponentProps &
  ModalStructureProps;


const ModalStructure: React.FC<ModalStructureCombinedProps> = (props) => {
  const {
    children,
    close,
    errors,
    isSubmitting,
    handleSubmit,
    status,
    submitBtnText,
    submitDanger,
    title,
  } = props;
  return (
    <Form onSubmit={handleSubmit}>
      <div className="modal-content">
        <ModalTitle>{title}</ModalTitle>
        <ModalBody>
          <div className="pf-c-form">{children}</div>
        </ModalBody>
        <ModalSubmitFooter
          errorMessage={status?.submitError}
          inProgress={isSubmitting}
          submitText={submitBtnText}
          submitDisabled={!_.isEmpty(errors)}
          submitDanger={submitDanger}
          cancel={close}
        />
      </div>
    </Form>
  );
};

export default ModalStructure;
