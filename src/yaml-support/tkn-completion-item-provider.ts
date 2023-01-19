/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import {CompletionItem, CompletionItemProvider as ICompletionItemProvider, SnippetString} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { contextGlobalState } from '../extension';
import { Snippet } from './snippet';
import * as semver from 'semver';

export default class TektonCompletionItemProvider implements ICompletionItemProvider {
  private newestVersion: string;
  public readonly encoding = 'utf-8';
  private readonly tektonSnippetsFile = path.join(contextGlobalState.extensionPath, 'snippets/tekton.json');
  protected items: CompletionItem[];

  constructor(newestVersion: string) {
    this.newestVersion = newestVersion;
    this.items = [];
  }

  public init(): Thenable<ICompletionItemProviderInitResult> {
    return this.generateItems();
  }

  public update(newestVersion: string): Thenable<ICompletionItemProviderInitResult> {
    this.newestVersion = newestVersion;
    this.items = [];
    return this.generateItems();
  }

  private generateItems(): Thenable<ICompletionItemProviderInitResult> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.tektonSnippetsFile, this.encoding, (readFileError, data) => {
        if (readFileError) {
          resolve(<ICompletionItemProviderInitResult>{success: false, error: readFileError});
        }
        else {
          try {
            let version = 'tekton.dev/v1beta1';
            if (this.newestVersion 
                  && this.newestVersion !== 'unknown' 
                  && semver.satisfies(this.newestVersion.replace('v',''), '>=0.43.0')) {
              version = 'tekton.dev/v1';
            }
            const dataAsJson: Map<string, Snippet<string[]>> = JSON.parse(data);
            for (const key in dataAsJson) {
              const body: string[] = dataAsJson[key].body;
              const bodyAsString = body.join('\n').replace('<pipelines_api_version>', version);
              const completionItem: CompletionItem = {
                label: key,
                detail: dataAsJson[key].description,                
                insertText: new SnippetString(bodyAsString),
              };
              this.items.push(completionItem);                
            }
  
            resolve(<ICompletionItemProviderInitResult>{success: true, error: undefined});
          }
          catch (error) {
            resolve(<ICompletionItemProviderInitResult>{success: false, error: error});
          }
        }
      });
    });
  }

  public provideCompletionItems(): CompletionItem[] {
    return this.items;
  }
}

export interface ICompletionItemProviderInitResult {
    success: boolean;
    error: Error;
}
