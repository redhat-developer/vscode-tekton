/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { tkn } from '../../src/tkn';
import { getTknConditionsSnippets } from '../../src/yaml-support/tkn-conditions-provider';

const expect = chai.expect;
chai.use(sinonChai);

suite('ConditionRef provider', () => {

  const sandbox = sinon.createSandbox();
  let tknExecute: sinon.SinonStub;

  setup(() => {
    tknExecute = sandbox.stub(tkn, 'execute');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('should return empty array if any error on getting condition list', async () => {
    tknExecute.resolves({ error: 'Some error' });
    const result = await getTknConditionsSnippets();
    expect(result).eql([]);
  });

  test('should array with condition names', async () => {
    tknExecute.resolves({ stdout: '{"items": [{"metadata": {"name": "foo"}}, {"metadata": {"name": "bar"}}]}' });
    const result = await getTknConditionsSnippets();
    expect(result).eql(['foo', 'bar']);
  });

});
