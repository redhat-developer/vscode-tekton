/* eslint-disable header/header */
// Copied from https://github.com/Azure/vscode-kubernetes-tools/blob/e16c0b239660585753dfed4732293737f6f5f06d/src/yaml-support/yaml-locator.ts

/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { parse, findNodeAtPosition } from 'node-yaml-parser';
import { TknDocument, isYamlDocumentSupported } from '../model/document';
import { TknElement, insideElement } from '../model/common';

export function isMapping(node: YamlNode): node is YamlMap {
  return node.kind === 'MAPPING';
}

export function isSequence(node: YamlNode): node is YamlSequence {
  return node.kind === 'SEQ';
}

export function isMappingItem(node: YamlNode): node is YamlMappingItem {
  return node.kind === 'PAIR';
}

export interface YamlNode {
  readonly kind: string;
  readonly raw: string;
  readonly startPosition: number;
  readonly endPosition: number;
  readonly parent?: YamlNode;
}

export interface YamlScalar extends YamlNode {
  readonly doubleQuoted?: boolean;
  readonly singleQuoted?: boolean;
}

export interface YamlMappingItem extends YamlNode {
  readonly key: YamlNode;
  readonly value: YamlNode;
}

export interface YamlMap extends YamlNode {
  readonly mappings: YamlMappingItem[];
}

export interface YamlSequence extends YamlNode {
  readonly items: YamlNode[];
}

export interface YamlDocument extends YamlNode {
  readonly nodes: YamlNode[];
  readonly errors: string[];
}

export interface YamlCachedDocuments {
  // the documents represents the yaml text
  yamlDocs: YamlDocument[];

  // lineLengths contains the converted line length of each lines, it is used for converting from
  // vscode position to the inner position in yaml element model.
  lineLengths: number[];

  // the version of the document to avoid duplicate work on the same text
  version: number;

  tknDocuments: TknDocument[];
}

export interface YamlMatchedElement {
  // the found node at the given position(usually at the edit/hover place)
  readonly matchedNode: YamlNode;

  // the document which contains the node at given position
  readonly matchedDocument: YamlDocument;
}

/**
 * An abstraction based on `vscode.TextDocument`, allow to work not only with documents opened in editor
 */
export interface VirtualDocument {
  uri: vscode.Uri;
  version: number;
  getText(): string;
}

/**
 * A yaml interpreter parse the yaml text and find the matched ast node from vscode location.
 */
export class YamlLocator {
  // a mapping of URIs to cached documents
  private cache: { [key: string]: YamlCachedDocuments } = {};

  /**
   * Parse the yaml text and find the best node&document for the given position.
   *
   * @param {vscode.TextDocument} textDocument vscode text document
   * @param {vscode.Position} pos vscode position
   * @returns {YamlMatchedElement} the search results of yaml elements at the given position
   */
  public getMatchedElement(textDocument: VirtualDocument, pos: vscode.Position): YamlMatchedElement {
    const key: string = textDocument.uri.toString();
    this.ensureCache(key, textDocument);
    const cacheEntry = this.cache[key];
    // findNodeAtPosition will find the matched node at given position
    return findNodeAtPosition(cacheEntry.yamlDocs, cacheEntry.lineLengths, pos.line, pos.character);
  }

  /**
   * Parse the yaml text and find the best node&document for the given position.
   *
   * @param {vscode.TextDocument} textDocument vscode text document
   * @param {vscode.Position} pos vscode position
   */
  public getYamlDocuments(textDocument: VirtualDocument): YamlDocument[] {
    const key: string = textDocument.uri.toString();
    this.ensureCache(key, textDocument);
    return this.cache[key].yamlDocs;
  }

  public getTknDocuments(textDocument: VirtualDocument): TknDocument[] {
    const key: string = textDocument.uri.toString();
    this.ensureCache(key, textDocument);
    return this.cache[key].tknDocuments;
  }

  getMatchedTknElement(textDocument: VirtualDocument, pos: vscode.Position): TknElement | undefined {
    const key: string = textDocument.uri.toString();
    this.ensureCache(key, textDocument);
    const cacheEntry = this.cache[key];
    const offset = this.convertPosition(cacheEntry.lineLengths, pos.line, pos.character);
    const doc = this.getDocumentAtPosition(cacheEntry.tknDocuments, offset);
    if (!doc) {
      return undefined;
    }
    return doc.findElement(offset);
  }

  private convertPosition(lineLens: number[], lineNumber: number, columnNumber: number): number {
    let pos = 0;
    for (let i = 0; i < lineNumber; i++) {
      pos += lineLens[i] + 1;
    }
    return pos + columnNumber;
  }

  private getDocumentAtPosition(documents: TknDocument[], pos: number): TknDocument {
    return documents.find(doc => insideElement(doc, pos));
  }

  private ensureCache(key: string, textDocument: VirtualDocument): void {
    if (!this.cache[key]) {
      this.cache[key] = { version: -1 } as YamlCachedDocuments;
    }

    if (this.cache[key].version !== textDocument.version) {
      // the document and line lengths from parse method is cached into YamlCachedDocuments to avoid duplicate
      // parse against the same text.
      const { documents, lineLengths } = parse(textDocument.getText());
      this.cache[key].yamlDocs = documents;
      this.cache[key].lineLengths = lineLengths;
      this.cache[key].version = textDocument.version;
      this.cache[key].tknDocuments = documents.filter(d => isYamlDocumentSupported(d)).map(d => new TknDocument(d, lineLengths));
    }
  }
}

// a global instance of yaml locator
const yamlLocator = new YamlLocator();

export { yamlLocator };
