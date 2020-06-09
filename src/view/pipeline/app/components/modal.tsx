/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as React from 'react';
import { ButtonBar } from '../utils/button-bar';
import { ActionGroup, Button } from '@patternfly/react-core';



export type ModalTitleProps = {
  className?: string;
};

export type ModalFooterProps = {
  message?: string;
  errorMessage?: string;
  inProgress: boolean;
};

export type ModalSubmitFooterProps = {
  message?: string;
  errorMessage?: string;
  inProgress: boolean;
  cancel: (e: React.SyntheticEvent<any, Event>) => void;
  cancelText?: React.ReactNode;
  submitText: React.ReactNode;
  submitDisabled?: boolean;
  submitDanger?: boolean;
};

export type ModalBodyProps = {
  className?: string;
};

export const ModalTitle: React.SFC<ModalTitleProps> = ({
  children,
  className = 'modal-header',
}) => (
  <div className={className}>
    <h1 className="pf-c-title pf-m-2xl" data-test-id="modal-title">
      {children}
    </h1>
  </div>
);

export const ModalBody: React.SFC<ModalBodyProps> = ({ children }) => (
  <div className="modal-body">
    <div className="modal-body-content">
      <div className="modal-body-inner-shadow-covers">{children}</div>
    </div>
  </div>
);

export const ModalFooter: React.SFC<ModalFooterProps> = ({
  message,
  errorMessage,
  inProgress,
  children,
}) => {
  return (
    <ButtonBar
      className="modal-footer"
      errorMessage={errorMessage}
      infoMessage={message}
      inProgress={inProgress}
    >
      {children}
    </ButtonBar>
  );
};

export const ModalSubmitFooter: React.SFC<ModalSubmitFooterProps> = ({
  message,
  errorMessage,
  inProgress,
  cancel,
  submitText,
  cancelText,
  submitDisabled,
  submitDanger,
}) => {
  const onCancelClick = (e) => {
    e.stopPropagation();
    cancel(e);
  };

  return (
    <ModalFooter inProgress={inProgress} errorMessage={errorMessage} message={message}>
      <ActionGroup className="pf-c-form pf-c-form__actions--right pf-c-form__group--no-top-margin">
        <Button
          type="button"
          variant="secondary"
          data-test-id="modal-cancel-action"
          onClick={onCancelClick}
        >
          {cancelText || 'Cancel'}
        </Button>
        {submitDanger ? (
          <Button type="submit" variant="danger" isDisabled={submitDisabled} id="confirm-action">
            {submitText}
          </Button>
        ) : (
          <Button type="submit" variant="primary" isDisabled={submitDisabled} id="confirm-action">
            {submitText}
          </Button>
        )}
      </ActionGroup>
    </ModalFooter>
  );
};
