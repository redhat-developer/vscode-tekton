/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as tkn from '../src/tkn';
import { k8sCommands } from '../src/kubernetes';

const expect = chai.expect;
chai.use(sinonChai);

suite('Kubernetos', () => {
  const sandbox = sinon.createSandbox();

  suite('K8s commands', () => {
    let executeInTerminalStub: sinon.SinonStub;
    setup(() => {
      executeInTerminalStub = sandbox.stub(tkn.tknInstance, 'executeInTerminal');
    });

    teardown(() => {
      sandbox.restore();
    });

    test('k8s.tekton.run.logs should call showTaskRunLogs if context is taskruns', () => {
      const command = tkn.Command.showTaskRunLogs('foo');
      k8sCommands.showLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'taskruns' } });
      expect(executeInTerminalStub).calledOnceWith(command);
    });

    test('k8s.tekton.run.logs should call showPipelineRunLogs if context is pipelineruns', () => {
      const command = tkn.Command.showPipelineRunLogs('foo');
      k8sCommands.showLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'pipelineruns' } });
      expect(executeInTerminalStub).calledOnceWith(command);
    });

    test('k8s.tekton.run.logs should throw error if it can\'t find proper type', () => {
      try {
        k8sCommands.showLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'foobar' } });
      } catch (err) {
        expect
      }
      expect(k8sCommands.showLogs.bind(k8sCommands, { name: 'foo', nodeType: 'resource', kind: { abbreviation: 'foobar' } })).to.throw('Can\'t handle log request for foo');

    });

    test('k8s.tekton.run.followLogs should call showTaskRunLogs if context is taskruns', () => {
      const command = tkn.Command.showTaskRunFollowLogs('foo');
      k8sCommands.followLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'taskruns' } });
      expect(executeInTerminalStub).calledOnceWith(command);
    });

    test('k8s.tekton.run.followLogs should call showPipelineRunLogs if context is pipelineruns', () => {
      const command = tkn.Command.showPipelineRunFollowLogs('foo');
      k8sCommands.followLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'pipelineruns' } });
      expect(executeInTerminalStub).calledOnceWith(command);
    });

    test('k8s.tekton.run.followLogs should throw error if it can\'t find proper type', () => {
      try {
        k8sCommands.followLogs({ name: 'foo', nodeType: 'resource', kind: { abbreviation: 'foobar' } });
      } catch (err) {
        expect
      }
      expect(k8sCommands.followLogs.bind(k8sCommands, { name: 'foo', nodeType: 'resource', kind: { abbreviation: 'foobar' } })).to.throw('Can\'t handle log request for foo');

    });
  });
});
