/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { disableButtonInput } from '../index';

export function disableRemoveButton(event: Node & ParentNode): void {
  const selectedItem = event.querySelectorAll('[id^=items-section-workspace-new-item]');
  if (selectedItem.length === 1) {
    const disableButton = event.querySelectorAll('.close-button');
    disableButton[0].className = 'close-button-disable';
  } else {
    const disableButton = event.querySelectorAll('.close-button-disable');
    if (disableButton[0]) {
      disableButton[0].className = 'close-button';
    }
  }
}

// Disable button if section are not selected for workspace
export function disableSelection(nodeList: HTMLCollectionOf<HTMLSelectElement>): boolean {
  const selectOption = ['Select a Config Map', 'Select a Secret', 'Select a PVC', 'Select Git Provider Type'];
  let startButton = document.querySelector('.startButton');
  if (!startButton) {
    startButton = document.querySelector('.startButton-disable')
  }
  for (let element = 0; element < nodeList.length; element++) {
    const findOption = selectOption.includes(nodeList[element].value);
    if (findOption) {
      startButton.className = 'startButton-disable';    // Disable the button.
      return false;
    } else {
      startButton.className = 'startButton';
    }
  }
  return true;
}

export function blockStartButton(): void {
  const disableButtonSection = disableSelection(document.getElementsByTagName('select'));
  if (disableButtonSection) {
    try {
      disableButtonInput(document.getElementsByTagName('input'));
    } catch (err) {
      // ignore if fails to find input
    }
  }
}
