/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as semver from 'semver';
import { tektonYaml, TektonYamlType } from './tkn-yaml';
import { generateScheme } from './tkn-yaml-scheme-generator';

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
  registerContributor(schema: string, requestSchema: (resource: string) => string, requestSchemaContent: (uri: string) => Promise<string>): boolean;
  modifySchemaContent(schemaModifications: SchemaAdditions | SchemaDeletions): Promise<void>;
}
const VSCODE_YAML_EXTENSION_ID = 'redhat.vscode-yaml';
let extContext: vscode.ExtensionContext;
const tektonUriCache = new Map<string, string>();

export async function registerYamlSchemaSupport(context: vscode.ExtensionContext): Promise<void> {
  extContext = context;
  const yamlPlugin = await activateYamlExtension();
  if (!yamlPlugin || !yamlPlugin.modifySchemaContent) {
    // activateYamlExtension has already alerted to users for errors.
    return;
  }

  yamlPlugin.registerContributor('tekton', requestYamlSchemaUriCallback, requestYamlSchemaContentCallback);

  //TODO: This is temporary, until 'vscode-yaml' not fixed 'modifySchemaContent' for contributed schema

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rcs = (yamlPlugin as any).requestCustomSchema.bind(yamlPlugin);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (yamlPlugin as any).requestCustomSchema = async (resource: string): Promise<string[]> => {
    const result: string[] = await rcs(resource);
    if (result.includes('kubernetes://schema/tekton.dev/v1alpha1@pipeline')) {
      const index = result.indexOf('kubernetes://schema/tekton.dev/v1alpha1@pipeline');
      if (index > -1) {
        result.splice(index, 1);
      }
    }

    return result;
  }
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
    const tektonYamlType = tektonYaml.isTektonYaml(textEditor.document);
    if (tektonYamlType && tektonYamlType === TektonYamlType.Pipeline) {
      let resourceUrl = vscode.Uri.parse(resource);
      resourceUrl = resourceUrl.with({ scheme: 'tekton' });
      tektonUriCache.set(resourceUrl.toString(), textEditor.document.uri.toString());
      return resourceUrl.toString();
    }
  }

  return undefined;
}

async function requestYamlSchemaContentCallback(uri: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  try {
    const doc = getDocument(uri);
    if (doc) {
      return generateScheme(extContext, doc);
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

