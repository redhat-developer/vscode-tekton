/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { BaseWidget } from '../common/widget';

export class ButtonsPanel extends BaseWidget {
  private startButton: HTMLAnchorElement;

  constructor(textContent?: string, className?: string, buttonClassName?: string) {
    super();
    this.element = document.createElement('div');
    this.element.className = className ?? 'buttons';

    this.startButton = document.createElement('a');
    this.startButton.textContent = textContent ?? 'Start';
    this.startButton.setAttribute('role', 'button');
    this.startButton.className = buttonClassName ?? 'startButton';
    this.startButton.onclick = () => this.addItem(this.startButton.parentNode.parentNode);
    this.element.appendChild(this.startButton);
  }

  addItem(event: Node & ParentNode): void {
    console.log(event);
  }
}
