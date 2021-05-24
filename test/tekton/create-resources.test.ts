/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as os from 'os';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as yaml from 'js-yaml';
import * as sinonChai from 'sinon-chai';
import { createNewResource } from '../../src/tekton/create-resources';
import { cli } from '../../src/cli';

const expect = chai.expect;
chai.use(sinonChai);

suite('create resources', () => {

  const sandbox = sinon.createSandbox();
  let cliStub: sinon.SinonStub;
  let osStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let unlinkStub: sinon.SinonStub;
  let safeDumpStub: sinon.SinonStub;

  const pvcResource = [{
    apiVersion: 'test',
    kind: 'pvc',
    metadata: {
      name: 'test',
    },
    spec: {
      accessMode: ['test'],
      resources: {
        requests: {
          storage: 'test'
        },
      },
      volumeMode: 'test'
    }
  }];

  setup(() => {
    cliStub = sandbox.stub(cli, 'execute').resolves({ error: null, stdout: '', stderr: '' });
    osStub = sandbox.stub(os, 'tmpdir').returns('path');
    writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
    unlinkStub = sandbox.stub(fs, 'unlink').resolves();
    safeDumpStub = sandbox.stub(yaml, 'safeDump').returns('empty');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('return null if no new resource found', async () => {
    const result = createNewResource([]);
    expect(result).deep.equals(result);
  });

  test('create new resource for pipeline', async () => {
    cliStub.onFirstCall().resolves({ error: null, stdout: 'successful', stderr: '' });
    await createNewResource(pvcResource);
    safeDumpStub.calledOnce;
    osStub.calledOnce;
    writeFileStub.calledOnce;
    unlinkStub.calledOnce;
  });

});
