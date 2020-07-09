/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Widget, BaseWidget } from '../common/widget';
import { createDiv } from '../utils/util';
import { EditItem } from '../utils/maincontent';
import { InputWidget } from './inputwidget';
import { NameType } from '../common/types';



export class SelectWidget extends BaseWidget {
  public select: HTMLSelectElement;
  constructor(id?: string) {
    super();
    this.element = createDiv('select-container');
    this.element.id = id ?? '';
    this.select = document.createElement('select');
    this.select.classList.add('editor-select-box');
    // this.select.onclick = () => this.selectText(this.select.parentNode);
    this.select.onchange = () => this.addInputBox(this.select.parentNode.parentNode);
    this.element.appendChild(this.select);
    // this.element.onload = () => this.selectText();
    // this.selectText();
  }

  selectText(): void {
    console.log('testteststststststststststtststststststststtstststststst');
    const iframe = document;//.getElementById('active-frame');
    console.log(iframe);
    const resourceSelectList = iframe['contentWindow'].document.getElementById('Resources').childNodes;
    console.log(resourceSelectList);
    const op = document.createElement('option');
    op.value = 'Create Pipeline Resource';
    op.text = 'Create Pipeline Resource';
    resourceSelectList.forEach(selectElement => {
      console.log('aaaaaaaaaaaaaaaaasasasasasassasasasasasassasasasasasasas');
      selectElement.insertBefore(op, this.select.firstChild)
    });
    // event.insertBefore(op, this.select.firstChild);
    // console.log(event);
  }

  addInputBox(event: any): void {
    const input = new EditItem('URL', new InputWidget('Please provide Name/URL'));
    // console.log(event);
    event.insertBefore(input.getElement(), event.nextSibling);
  }

  pipelineResource(items: string[], resource: NameType): Widget {
    items.forEach(val => {
      if (val['spec'].type === resource.type) {
        const op = document.createElement('option');
        op.value = val['metadata'].name;
        op.text = val['metadata'].name;
        this.select.appendChild(op);
      }
    });
    return this;
  }

  workspaces(type: unknown): Widget {
    Object.keys(type).forEach(val => {
      const op = document.createElement('option');
      op.value = val;
      op.text = val;
      this.select.appendChild(op);
    });
    return this;
  }
}
