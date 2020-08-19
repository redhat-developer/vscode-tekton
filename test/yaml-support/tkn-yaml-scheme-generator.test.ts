/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as path from 'path';
import { generateScheme } from '../../src/yaml-support/tkn-yaml-scheme-generator';
import { TestTextDocument } from '../text-document-mock';
import * as tasksProvider from '../../src/yaml-support/tkn-tasks-provider';
import * as conditionsProvider from '../../src/yaml-support/tkn-conditions-provider';

const expect = chai.expect;
chai.use(sinonChai);

suite('Pipeline scheme generator', () => {
  const sandbox = sinon.createSandbox();

  setup(() => {
    sandbox.stub(tasksProvider, 'getTknTasksSnippets').resolves([]);
    sandbox.stub(conditionsProvider, 'getTknConditionsSnippets').resolves([]);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Generator should add markdown description', async () => {
    const doc = new TestTextDocument(vscode.Uri.file('/foo/PipelineSchemeGenerator.yaml'), 'Foo: bar');
    const result = await generateScheme(doc, path.resolve(__dirname, '..', '..', '..', 'scheme', 'tekton.dev', 'v1beta1_Pipeline.json'));
    const scheme = JSON.parse(result);
    expect(scheme.definitions.Pipeline.properties.apiVersion.markdownDescription).equal('Specifies the API version, for example `tekton.dev/v1beta1`. [more](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#required-fields)');
  });
});
