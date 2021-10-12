/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

let count = 1;
const group = document.getElementById('slg');
export const listGroup = group.querySelector('li ul');
const listArray = group.querySelectorAll('li ul li');


export function enterEvent(event: KeyboardEvent): void {
  event.target['value'] = listGroup.querySelector('[data-highlight="true"]').innerHTML;
}

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

export function keyUpDown(): void {
  const taskInput = document.getElementById('taskInput');
  taskInput.onkeydown = function (e) {
    const items = document.querySelectorAll('li[data-display="true"]');
    const last = items[items.length - 1];
    const first = items[0];
    if (e.code === 'ArrowUp') {
      if (count === 0) {
        count = 2;
      }
      count--;
      count = count <= 0 ? items.length : count;
      items[count - 1]['dataset'].highlight = items[count - 1] ? 'true' : 'false';
      if (items[count]) {
        items[count]['dataset'].highlight = 'false';
      } else if (items && items.length === 1) {
        last['dataset'].highlight = 'true';
      } else {
        first['dataset'].highlight = 'false';
      }
    }
    if (e.code === 'ArrowDown') {
      count = count >= items.length ? 0 : count
      items[count]['dataset'].highlight = items[count] ? 'true' : 'false';
      if (items[count - 1]) {
        items[count - 1]['dataset'].highlight = 'false';
      } else if (items && items.length === 1) {
        last['dataset'].highlight = 'true';
      } else {
        last['dataset'].highlight = 'false';
      }
      count++;
      count = count >= items.length ? 0 : count;
    }
  };
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
