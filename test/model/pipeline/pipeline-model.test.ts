/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { yamlLocator } from '../../../src/yaml-support/yaml-locator';
import { TknElementType } from '../../../src/model/element-type';
import { TektonYamlType } from '../../../src/yaml-support/tkn-yaml';
import { Pipeline, PipelineTask, PipelineTaskRef } from '../../../src/model/pipeline/pipeline-model';

const expect = chai.expect;
chai.use(sinonChai);

suite('Pipeline Model', () => {
  //TODO: move this suite in separate file
  suite('TknDocuments', () => {
    test('"getTknDocuments" should return TknDocument[]', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);

      expect(docs).is.not.undefined;
      expect(docs).is.not.empty;
      expect(docs).length(1);
    });

    test('TknDocument should return Pipeline', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];

      expect(tknDoc.parent).is.undefined;
      expect(tknDoc.type).equal(TknElementType.DOCUMENT);
      expect(tknDoc.getChildren()).not.undefined;
    });
  });

  test('TknDocument should return Pipeline', async () => {
    const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
    const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
    const tknDoc = docs[0];
    const pipeline = tknDoc.getChildren<Pipeline>();

    expect(pipeline.kind.value).eq(TektonYamlType.Pipeline);
    expect(pipeline.metadata.name.value).eq('tutorial-pipeline');
    expect(pipeline.spec.tasks.getChildren()).length(2);
  });


  suite('TknElement search', () => {
    test('findElementAt should return taskName node', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(12, 23));
      expect(tknEl).not.undefined;
      expect(tknEl.type).eq(TknElementType.VALUE);
      expect(tknEl.parent.type).eq(TknElementType.PIPELINE_TASK);
    });

    test('findElementAt should return undefined if position outside of document', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(110, 23));
      expect(tknEl).undefined;
    });

    test('findElementAt should return task element if position in "- name"', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(12, 8));
      expect(tknEl).not.undefined;
      expect(tknEl.type).eq(TknElementType.PIPELINE_TASK);
    });

    test('findElementAt should return resource optional', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(8, 10));
      expect(tknEl).not.undefined;
      expect(tknEl.type).eq(TknElementType.PIPELINE_RESOURCE);
    });


    test('findElementAt should return key element', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', '/model/pipeline/pipeline.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline.yam') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(14, 10));
      expect(tknEl).not.undefined;
      expect(tknEl.type).eq(TknElementType.PIPELINE_TASK_REF);
      expect((tknEl as PipelineTaskRef).name.value).eq('build-docker-image-from-git-source');
    });

    test('findElementAt should return finally task', async () => {
      const yaml = await fs.readFile(path.join(__dirname, '..', '..', '..', '..', 'test', 'model', 'pipeline', 'pipeline-with-finally.yaml'));
      const docs = yamlLocator.getTknDocuments({ getText: () => yaml.toString(), version: 1, uri: vscode.Uri.parse('file:///model/pipeline/pipeline-with-finally.yaml') } as vscode.TextDocument);
      const tknDoc = docs[0];
      const tknEl = tknDoc.findElementAt(new vscode.Position(26, 12));
      expect(tknEl).not.undefined;
      expect(tknEl.type).eq(TknElementType.PIPELINE_TASK);
      expect((tknEl as PipelineTask).name.value).eq('cleanup');
    });
  });


});
