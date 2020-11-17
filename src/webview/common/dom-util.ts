/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export function createDiv(className: string, id?: string): HTMLDivElement {
  const element = document.createElement('div');
  if (className) element.classList.add(className);
  if (id){
    element.id = id;
  }
  return element;
}

export function createSpan(...classNames: string[]): HTMLSpanElement {
  const element = document.createElement('span');
  if (classNames){
    element.classList.add(...classNames);
  }
  return element;
}
