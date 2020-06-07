/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as _ from 'lodash-es';
import * as React from 'react';
import * as classNames from 'classnames';
import { Alert } from '@patternfly/react-core';
import * as PropTypes from 'prop-types';
import { ActionGroup, Button } from '@patternfly/react-core';
import { LoadingInline } from './status-box';

export type ModalTitleProps = {
  className?: string;
};

export type ModalBodyProps = {
  className?: string;
};

export type ModalSubmitFooterProps = {
  message?: string;
  errorMessage?: string;
  inProgress: boolean;
  cancel: (e: React.SyntheticEvent<unknown, Event>) => void;
  cancelText?: React.ReactNode;
  submitText: React.ReactNode;
  submitDisabled?: boolean;
  submitDanger?: boolean;
};

export type ModalFooterProps = {
  message?: string;
  errorMessage?: string;
  inProgress: boolean;
};

export const ModalTitle: React.SFC<ModalTitleProps> = ({
  children,
  className = 'modal-header',
}) => (
  <div className={className}>
    <h1 className="title-size" data-test-id="modal-title">
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

const injectDisabled = (children, disabled) => {
  return React.Children.map(children, (c) => {
    if (!_.isObject(c) || c.type !== 'button') {
      return c;
    }
  
    return React.cloneElement(c, { disabled: c.props.disabled || disabled });
  });
};
  
const ErrorMessage = ({ message }) => (
  <Alert
    isInline
    className="co-alert co-alert--scrollable"
    variant="danger"
    title="An error occurred"
  >
    <div className="co-pre-line">{message}</div>
  </Alert>
);
const InfoMessage = ({ message }) => (
  <Alert isInline className="co-alert" variant="info" title={message} />
);
const SuccessMessage = ({ message }) => (
  <Alert isInline className="co-alert" variant="success" title={message} />
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const ButtonBar = ({
  children,
  className,
  errorMessage,
  infoMessage,
  successMessage,
  inProgress,
}) => {
  return (
    <div className={classNames(className, 'co-m-btn-bar')}>
      {successMessage && <SuccessMessage message={successMessage} />}
      {errorMessage && <ErrorMessage message={errorMessage} />}
      {injectDisabled(children, inProgress)}
      {inProgress && <LoadingInline />}
      {infoMessage && <InfoMessage message={infoMessage} />}
    </div>
  );
};
  
ButtonBar.propTypes = {
  children: PropTypes.node.isRequired,
  successMessage: PropTypes.string,
  errorMessage: PropTypes.string,
  infoMessage: PropTypes.string,
  inProgress: PropTypes.bool.isRequired,
  className: PropTypes.string,
};

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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

