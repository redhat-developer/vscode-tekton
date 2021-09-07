/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

const group = document.getElementById('slg');
export const listGroup = group.querySelector('li ul');
const listArray = group.querySelectorAll('li ul li');


export function dropDownForTags(input: string): void {
  for (let i = 0; i < listArray.length; i++) {
    matching(listArray[i], input.trim());
  }
  showList(listGroup);
}

export function showList(ele): void {
  ele.dataset.toggle = 'true';
}

export function hideList(ele): void {
  ele.dataset.toggle = 'false';
}

export function matching(item, input: string): void {
  const str = new RegExp(input, 'gi');
  if (item.innerHTML.match(str) && input?.trim().match(/^@/gm)) {
    item.dataset.display = 'true'
  } else {
    item.dataset.display = 'false';
    item.dataset.highlight = 'false';
  }
}

export function initItem(item): void {
  item.dataset.display = 'true';
  item.dataset.highlight = 'false';
}

export function initList(): void {
  for (let i = 0; i < listArray.length; i++) {
    initItem(listArray[i]);
    listArray[i].addEventListener('click', copyPaste);
  }
}

function copyPaste(): void {
  const taskInput = document.getElementById('taskInput');
  taskInput['value'] = this.innerHTML;
  initList();
  hideList(listGroup);
}
