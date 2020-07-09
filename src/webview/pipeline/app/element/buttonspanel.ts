/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from '../common/widget';

export class ButtonsPanel extends BaseWidget {
  private startButton: HTMLAnchorElement;

  constructor() {
    super();
    this.element = document.createElement('div');
    this.element.className = 'buttons';

    this.startButton = document.createElement('a');
    this.startButton.textContent = 'Start';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = 'startButton';
    this.element.appendChild(this.startButton);

  }
}
