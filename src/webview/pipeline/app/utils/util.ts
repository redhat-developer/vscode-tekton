/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export function selectText(nodeList: NodeListOf<Element>, text?: string, selected?: boolean, id?: string): void {
  nodeList.forEach(element => {
    const resourceSelectList = element.childNodes;
    const op = document.createElement('option');
    op.value = text;
    op.text = text;
    op.id = id ?? '';
    op.selected = selected ?? false;
    resourceSelectList.forEach(selectElement => {
      selectElement.insertBefore(op, selectElement.firstChild);
    });
  })
}
