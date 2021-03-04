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
import { TknTask } from '../../src/tekton';

const expect = chai.expect;
chai.use(sinonChai);

suite('Pipeline scheme generator', () => {
  const sandbox = sinon.createSandbox();

  let getRawTasksStub: sinon.SinonStub;

  setup(() => {
    sandbox.stub(tasksProvider, 'getTknTasksSnippets').resolves([]);
    sandbox.stub(conditionsProvider, 'getTknConditionsSnippets').resolves([]);
    getRawTasksStub = sandbox.stub(tasksProvider, 'getRawTasks');
    getRawTasksStub.resolves([]);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Generator should add markdown description', async () => {
    const doc = new TestTextDocument(vscode.Uri.file(path.join('foo', 'PipelineSchemeGenerator.yaml')), 'Foo: bar');
    const result = await generateScheme(doc, path.resolve(__dirname, '..', '..', '..', 'scheme', 'tekton.dev', 'v1beta1_Pipeline.json'));
    const scheme = JSON.parse(result);
    expect(scheme.definitions.Pipeline.properties.apiVersion.markdownDescription).equal('Specifies the API version, for example `tekton.dev/v1beta1`. [more](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#required-fields)');
  });

  test('Generator should add const variables', async () => {
    const doc = new TestTextDocument(vscode.Uri.file(path.join('foo', 'PipelineSchemeGenerator.yaml')), 'Foo: bar');
    const result = await generateScheme(doc, path.resolve(__dirname, '..', '..', '..', 'scheme', 'tekton.dev', 'v1beta1_Pipeline.json'));
    const scheme = JSON.parse(result);
    expect(scheme.definitions.Param.properties.value.defaultSnippets).is.not.an('undefined');
    expect(scheme.definitions.Param.properties.value.defaultSnippets).to.deep.include({
      label: '"$(context.pipeline.name)"',
      body: '"$(context.pipeline.name)"',
      description: 'The name of this Pipeline.'
    });
  });

  test('Generator add task result variables', async () => {
    getRawTasksStub.resolves([
      {
        metadata: {
          name: 'Foo-Task'
        },
        spec: {
          results: [
            {
              name: 'FooResult',
              description: 'Foo Result Description'
            }
          ]
        }
      } as TknTask,
    ]);

    const yaml = `
    apiVersion: tekton.dev/v1beta1
    kind: Pipeline
    metadata:
      name: demo-pipeline
    spec:
      tasks:
        - name: Foo-Task-pipeline-task
          taskRef:
            name: Foo-Task
    `;
    const doc = new TestTextDocument(vscode.Uri.file(path.join('foo', 'PipelineSchemeGenerator2.yaml')), yaml);
    const result = await generateScheme(doc, path.resolve(__dirname, '..', '..', '..', 'scheme', 'tekton.dev', 'v1beta1_Pipeline.json'));
    const scheme = JSON.parse(result);
    expect(scheme.definitions.Param.properties.value.defaultSnippets).to.deep.include({
      label: '"$(tasks.Foo-Task-pipeline-task.results.FooResult)"',
      body: '"$(tasks.Foo-Task-pipeline-task.results.FooResult)"',
      description: 'Foo Result Description'
    });
  });

  test('Generator should add custom task name to tasks ref enum', async () => {
    const yaml = `
    apiVersion: tekton.dev/v1beta1
    kind: Pipeline
    metadata:
      name: example
    spec:
      params:
      - name: pipeline-param
        default: hello
      tasks:
      - name: example-task
        taskRef:
          apiVersion: example.dev/v0
          kind: Example
          name: my-example
        params:
        - name: task-param
          value: "$(params.pipeline-param)"
        `
    const doc = new TestTextDocument(vscode.Uri.file(path.join('foo', 'PipelineSchemeGenerator3.yaml')), yaml);
    const result = await generateScheme(doc, path.resolve(__dirname, '..', '..', '..', 'scheme', 'tekton.dev', 'v1beta1_Pipeline.json'));
    const scheme = JSON.parse(result);
    expect(scheme.definitions.TaskRef.properties.name.enum).is.contains('my-example');

  });
});
