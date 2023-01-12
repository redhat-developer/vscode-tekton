/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { tektonFSUri, tektonVfsProvider } from '../../src/util/tekton-vfs';
import * as vscode from 'vscode';
import * as os from 'os'
import * as fsx from 'fs-extra';
import * as path from 'path';
import { teardown } from 'mocha';
import { newK8sCommand } from '../../src/cli-command';
import { TknImpl } from '../../src/tkn';
import { ToolsConfig } from '../../src/tools';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton VFS Provider', () => {
  const sandbox = sinon.createSandbox();

  teardown(() => {
    sandbox.restore();
  });

  suite('Tekton FS Uri', () => {
    test('tektonFSUri should return uri', () => {
      const uri = tektonFSUri('pipeline', 'foo', 'yaml', 'c85f064e-fbea-45cc-8e5c-167733cd3198');
      expect(uri).is.not.undefined;
      expect(uri.toString()).equal('tekton://kubernetes/pipeline/foo%40c85f064e.yaml');
    });

    test('tektonFSUri should return uri with readonly scheme for pipelinerun', () => {
      const uri = tektonFSUri('pipelinerun', 'foo', 'yaml', 'c85f064e-fbea-45cc-8e5c-167733cd3198');
      expect(uri).is.not.undefined;
      expect(uri.toString()).equal('tekton-ro://kubernetes/pipelinerun/foo%40c85f064e.yaml');
    });

    test('tektonFSUri should return uri with readonly scheme for taskrun', () => {
      const uri = tektonFSUri('taskrun', 'foo', 'yaml', 'c85f064e-fbea-45cc-8e5c-167733cd3198');
      expect(uri).is.not.undefined;
      expect(uri.toString()).equal('tekton-ro://kubernetes/taskrun/foo%40c85f064e.yaml');
    })
  });

  suite('Tekton VFS', () => {
    let cliExecuteStub: sinon.SinonStub;
    let tmpdirStub: sinon.SinonStub;
    let unlinkStub: sinon.SinonStub;
    let writeFileStub: sinon.SinonStub;
    let ensureFileStub: sinon.SinonStub;
    let statStub: sinon.SinonStub;

    setup(() => {
      cliExecuteStub = sandbox.stub(TknImpl.prototype, 'execute');
      tmpdirStub = sandbox.stub(os, 'tmpdir');
      unlinkStub = sandbox.stub(fsx, 'unlink');
      writeFileStub = sandbox.stub(fsx, 'writeFile');
      ensureFileStub = sandbox.stub(fsx, 'ensureFile');
      statStub = sandbox.stub(fsx, 'stat');
      sandbox.stub(ToolsConfig, 'getToolLocation').returns('1.18.0');
    });

    test('extractResourceAndFormat should return resource and format', () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      const [resource, format] = tektonVfsProvider.extractResourceAndFormat(uri);
      expect(resource).equal('pipeline/foo');
      expect(format).equal('yaml');
    });

    test('extractResourceAndFormat should return default format if not specified', () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo');
      const [resource, format] = tektonVfsProvider.extractResourceAndFormat(uri);
      expect(resource).equal('pipeline/foo');
      expect(format).equal('yaml');
    });

    test('watch should return disposable', () => {
      const result = tektonVfsProvider.watch();
      expect(result).is.not.undefined;
    });

    test('"stat" should return stat', () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      const result = tektonVfsProvider.stat(uri) as vscode.FileStat;
      expect(result).is.not.undefined;
      expect(result.type).equal(vscode.FileType.File);
      expect(result.mtime >= 0).true;
    });

    test('"readFile" should return file content', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      cliExecuteStub.resolves({ stdout: 'Foo file content' });
      const file = await tektonVfsProvider.readFile(uri);
      expect(file.toString()).equal('Foo file content');
      expect(cliExecuteStub).calledOnceWith(newK8sCommand('-o yaml get pipeline/foo'));
    });

    test('"readFile" should throw an error if cli provide error', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      cliExecuteStub.resolves({ error: 'Can"t get file content' });
      let error = undefined;
      try {
        await tektonVfsProvider.readFile(uri);
      } catch (err) {
        error = err
      } finally {
        expect(error).not.undefined;
        expect(error.toString()).equal('Error: Can"t get file content');
      }
    });

    test('"writeFile" should write file', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      const content = Buffer.from('Foo write content', 'utf8');

      tmpdirStub.returns(path.join('tmp', 'bar'));
      ensureFileStub.resolves();
      writeFileStub.resolves();
      cliExecuteStub.resolves({ stdout: '' });
      statStub.resolves({ size: 1 });
      unlinkStub.resolves();
      const tmpPath = path.join('tmp', 'bar', 'pipeline', 'foo.yaml');

      await tektonVfsProvider.writeFile(uri, content);

      expect(tmpdirStub).calledOnce;
      expect(ensureFileStub).calledOnceWith(tmpPath);
      expect(writeFileStub).calledOnce;
      expect(cliExecuteStub).calledOnceWith(newK8sCommand(`apply -f ${tmpPath}`));
      expect(unlinkStub).calledOnceWith(tmpPath);
    });

    test('"writeFile" should throw error if cannot update file', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      const content = Buffer.from('Foo write content', 'utf8');

      tmpdirStub.returns(path.join('tmp', 'bar'));
      ensureFileStub.resolves();
      writeFileStub.resolves();
      cliExecuteStub.resolves({ error: 'Cannot update file' });
      statStub.resolves({ size: 1 });
      unlinkStub.resolves();
      const tmpPath = path.join('tmp', 'bar', 'pipeline', 'foo.yaml');
      let error = undefined;
      try {
        await tektonVfsProvider.writeFile(uri, content);
      } catch (err) {
        error = err;
      } finally {
        expect(cliExecuteStub).calledOnceWith(newK8sCommand(`apply -f ${tmpPath}`));
        expect(unlinkStub).calledOnceWith(tmpPath);
        expect(error).is.not.undefined;
        expect(error.toString()).equal('Error: Cannot update file');
      }
    });

    test('"writeFile" should fire watch event after save', (done) => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      const content = Buffer.from('Foo write content', 'utf8');

      tmpdirStub.returns('/tmp/bar');
      ensureFileStub.resolves();
      writeFileStub.resolves();
      cliExecuteStub.resolves({ stdout: '' });
      statStub.resolves({ size: 1 });
      unlinkStub.resolves();

      let event: vscode.FileChangeEvent[] = undefined;

      tektonVfsProvider.writeFile(uri, content).then(() => {
        tektonVfsProvider.onDidChangeFile((e) => event = e);
        setTimeout(() => {
          expect(event).is.not.undefined;
          expect(event.length).equals(1);
          expect(event[0].uri.toString()).equal('tekton://kubernetes/pipeline/foo.yaml');
          expect(event[0].type).equal(vscode.FileChangeType.Changed);
          done();
        }, 11);
      });

    });

    test('"loadTektonDocument" should return virtual document', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      cliExecuteStub.resolves({ stdout: 'Foo file content' });
      const doc = await tektonVfsProvider.loadTektonDocument(uri);
      expect(doc.getText()).equal('Foo file content');
      expect(cliExecuteStub).calledOnceWith(newK8sCommand('-o yaml get pipeline/foo'));
    });

    test('"loadTektonDocument" should throw an error if cli provide error', async () => {
      const uri = vscode.Uri.parse('tekton://kubernetes/pipeline/foo.yaml');
      cliExecuteStub.resolves({ error: 'Can"t get file content' });
      let error = undefined;
      try {
        await tektonVfsProvider.loadTektonDocument(uri);
      } catch (err) {
        error = err
      } finally {
        expect(error).not.undefined;
        expect(error.toString()).equal('Can"t get file content');
      }
    });

    test('readDirectory always return empty array', () => {
      const result = tektonVfsProvider.readDirectory();
      expect(result).is.not.undefined;
    });

  });
});
