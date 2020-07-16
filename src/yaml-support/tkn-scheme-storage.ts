/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

interface TknSchemeCacheItem {
  scheme: string;
  version: number;
}

export interface SchemeGenerator {
  (vsDocument: vscode.TextDocument): Promise<string>;
}

export class TknSchemeStorage {

  private cache: { [key: string]: TknSchemeCacheItem } = {};

  async getScheme(vsDocument: vscode.TextDocument, generator: SchemeGenerator): Promise<string> {
    const key = vsDocument.uri.toString();
    await this.ensureCache(key, vsDocument, generator);
    return this.cache[key].scheme;
  }

  private async ensureCache(key: string, doc: vscode.TextDocument, generator: SchemeGenerator): Promise<void> {
    if (!this.cache[key]) {
      this.cache[key] = { version: -1 } as TknSchemeCacheItem;
    }

    if (this.cache[key].version !== doc.version) {
      try {
        const scheme = await generator(doc);
        this.cache[key].scheme = scheme;
        this.cache[key].version = doc.version;
      } catch (err) {
        console.error(err);
      }

    }
  }
}

const schemeStorage = new TknSchemeStorage();

export { schemeStorage };
