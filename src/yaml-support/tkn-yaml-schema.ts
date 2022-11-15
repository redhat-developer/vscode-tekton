/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as semver from 'semver';
import { tektonYaml } from './tkn-yaml';
import { generateScheme } from './tkn-yaml-scheme-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

enum MODIFICATION_ACTIONS {
  'delete',
  'add'
}

interface SchemaAdditions {
  schema: string;
  action: MODIFICATION_ACTIONS.add;
  path: string;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}

interface SchemaDeletions {
  schema: string;
  action: MODIFICATION_ACTIONS.delete;
  path: string;
  key: string;
}

interface YamlExtensionAPI {
  registerContributor(schema: string, requestSchema: (resource: string) => string, requestSchemaContent: (uri: string) => Promise<string>, label?: string): boolean;
  modifySchemaContent(schemaModifications: SchemaAdditions | SchemaDeletions): Promise<void>;
}
const VSCODE_YAML_EXTENSION_ID = 'redhat.vscode-yaml';
let extContext: vscode.ExtensionContext;
const tektonUriCache = new Map<string, string>();
let schemaPaths: string[];

export async function registerYamlSchemaSupport(context: vscode.ExtensionContext): Promise<void> {
  extContext = context;
  const yamlPlugin = await activateYamlExtension();
  if (!yamlPlugin || !yamlPlugin.modifySchemaContent) {
    // activateYamlExtension has already alerted to users for errors.
    return;
  }

  schemaPaths = (await fs.readFile(context.asAbsolutePath('scheme/index.properties'))).toString().split(/[\n|\r\n]+/);

  yamlPlugin.registerContributor('tekton', requestYamlSchemaUriCallback, requestYamlSchemaContentCallback, 'apiVersion:tekton.dev/v1beta1');
  yamlPlugin.registerContributor('triggers-tekton', requestYamlSchemaUriCallback, requestYamlSchemaContentCallback, 'apiVersion:triggers.tekton.dev/v1alpha1');
}

async function activateYamlExtension(): Promise<YamlExtensionAPI | undefined> {
  const ext = vscode.extensions.getExtension(VSCODE_YAML_EXTENSION_ID);
  if (!ext) {
    vscode.window.showWarningMessage('Please install \'YAML Support by Red Hat\' via the Extensions pane.');
    return undefined;
  }
  const yamlPlugin = await ext.activate();

  if (!yamlPlugin || !yamlPlugin.registerContributor) {
    vscode.window.showWarningMessage('The installed Red Hat YAML extension doesn\'t support Kubernetes Intellisense. Please upgrade \'YAML Support by Red Hat\' via the Extensions pane.');
    return undefined;
  }

  if (!yamlPlugin || !yamlPlugin.modifySchemaContent) {
    vscode.window.showWarningMessage('The installed Red Hat YAML extension doesn\'t support in memory schemas modification. Please upgrade \'YAML Support by Red Hat\' via the Extensions pane.');
    return undefined;
  }
  if (ext.packageJSON.version && !semver.gte(ext.packageJSON.version, '0.7.2')) {
    vscode.window.showWarningMessage('The installed Red Hat YAML extension doesn\'t support schemas modification. Please upgrade \'YAML Support by Red Hat\' via the Extensions pane.');
  }
  return yamlPlugin;
}


function requestYamlSchemaUriCallback(resource: string): string | undefined {
  const textEditor = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === resource);
  if (textEditor) {
    const schemaPath = tektonYaml.getApiVersionAndTypePath(textEditor.document);
    if (schemaPath) {
      if (schemaPaths.includes(schemaPath)) {
        let resourceUrl = vscode.Uri.parse(resource);
        let scheme: string;
        if (schemaPath.startsWith('triggers.tekton.dev')) {
          scheme = 'triggers-tekton'
        } else {
          scheme = 'tekton';
        }
        resourceUrl = resourceUrl.with({ scheme });
        tektonUriCache.set(resourceUrl.toString(), textEditor.document.uri.toString());
        return resourceUrl.toString();
      }

    }
  }

  return undefined;
}

async function requestYamlSchemaContentCallback(uri: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  try {
    const doc = getDocument(uri);
    if (doc) {
      const schemaPath = tektonYaml.getApiVersionAndTypePath(doc);
      if (schemaPath) {
        const absPath = extContext.asAbsolutePath(path.join('scheme', schemaPath));
        if (await fs.pathExists(absPath)) {
          return generateScheme(doc, absPath);
        }
      }

    }

  } catch (err) {
    console.error(err);
  }

  return undefined;

}

function getDocument(tektonUri: string): vscode.TextDocument | undefined {
  if (tektonUriCache.has(tektonUri)) {
    const resource = tektonUriCache.get(tektonUri);
    const textEditor = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === resource);
    if (textEditor) {
      return textEditor.document;
    }
  }
}
