/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType, Tkn } from '../../src/tkn';
import { TestItem } from './testTektonitem';
import { TektonItem } from '../../src/tekton/tektonitem';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelinesStub: sinon.SinonStub;

    const pipelineItem = new TestItem(undefined, 'pipeline', ContextType.PIPELINE);
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN, undefined, "2019-07-25T12:03:00Z", "True");

    setup(() => {
        sandbox = sinon.createSandbox();
        getPipelinesStub = sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({error: undefined, stdout: '', stderr: ''});
        sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(TektonItem, 'getPipelinerunNames').resolves([pipelinerunItem]);
    });

    teardown(() => {
        sandbox.restore();
    });

});