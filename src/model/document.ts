/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TknElement, TknElementType, TknBaseRootElement, insideElement } from './common';
import { YamlDocument } from '../yaml-support/yaml-locator';
import { tektonYaml, TektonYamlType } from '../yaml-support/tkn-yaml';
import { Pipeline } from './pipeline/pipeline-model';
import * as vscode from 'vscode';


export function isYamlDocumentSupported(doc: YamlDocument): boolean {
  const type = tektonYaml.getTektonYamlType(doc);
  if (type === TektonYamlType.Pipeline) {
    return true;
  }

  return false;
}

export class TknDocument extends TknElement {

  type = TknElementType.DOCUMENT;
  private element: TknBaseRootElement;
  constructor(private doc: YamlDocument, private lineLengths: number[]) {
    super(undefined, doc);
  }

  getChildren<T extends TknBaseRootElement>(): T {
    if (!this.element) {
      const yamlType = tektonYaml.getTektonYamlType(this.doc);
      if (yamlType) {
        this.element = this.createChild(yamlType);
      }
    }

    return this.element as T;
  }

  private createChild(type: TektonYamlType): TknBaseRootElement {
    switch (type) {
      case TektonYamlType.Pipeline:
        return new Pipeline(this, tektonYaml.getRootMap(this.doc));


      default:
        throw new Error(`Type ${type} is not supported`);
    }
  }

  /**
    * Find the best element for the given position.
    *
    * @param {vscode.Position} pos vscode position
    * @returns {TknElement} the search results of yaml elements at the given position
    */
  findElementAt(position: vscode.Position): TknElement | undefined {
    const pos = this.convertPosition(position.line, position.character);
    if (insideElement(this, pos)) {
      return this.findElement(pos);
    } else {
      return undefined;
    }
  }

  findElement(pos: number): TknElement {
    return this.getChildren().findElement(pos);
  }

  private convertPosition(line: number, column: number): number {

    let pos = 0;
    for (let i = 0; i < line; i++) {
      pos += this.lineLengths[i] + 1;
    }
    return pos + column;
  }
}

