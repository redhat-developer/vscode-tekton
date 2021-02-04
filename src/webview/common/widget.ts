/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export type Listener<T> = (item: T) => void;


export interface Widget {
  getElement(): HTMLElement;
}

export class BaseWidget implements Widget {
  protected element: HTMLElement;

  getElement(): HTMLElement {
    return this.element;
  }

  clear(): void {
    if (this.element){
      this.element.innerHTML = '';
    }
  }
}
