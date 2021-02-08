/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { createDiv } from './dom-util';
import { BaseWidget } from './widget';
import './loader.css';

export class Loader extends BaseWidget {
  constructor() {
    super();
    this.element = createDiv('progress');
    const value = createDiv('progress-value');
    this.element.appendChild(value);
    this.hide();
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'block';
  }
}
