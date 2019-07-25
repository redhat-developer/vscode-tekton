/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { PipelineExplorer } from '../src/pipeline/pipelineExplorer';
import { TknImpl, ContextType, TektonNodeImpl } from '../src/tkn';
import { TestItem } from './tekton/testTektonitem';
import sinon = require('sinon');
import { doesNotReject } from 'assert';
import { ClusterProviderV1 } from 'vscode-kubernetes-tools-api';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton Application Explorer', () => {
    const pipelineNode = new TestItem(TknImpl.ROOT, 'Pipelines', ContextType.PIPELINENODE);
    const taskNode = new TestItem(TknImpl.ROOT, 'Tasks', ContextType.TASKNODE);
    const clusterTaskNode = new TestItem(TknImpl.ROOT, 'ClusterTasks', ContextType.CLUSTERTASKNODE);
    const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE);
    const pipelinerunItem = new TestItem(pipelineItem, 'pipelinerun', ContextType.PIPELINERUN);
    const taskrunItem = new TestItem(pipelinerunItem, 'taskrun', ContextType.TASKRUN);
    const taskItem = new TestItem(taskNode, 'task', ContextType.TASK);
    const clustertaskItem = new TestItem(clusterTaskNode, 'clustertask', ContextType.TASK);
    const sandbox = sinon.createSandbox();

    let tektonInstance: PipelineExplorer;

    setup(() => {
        sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('delegate calls to TektonObject instance', async () => {
        tektonInstance = PipelineExplorer.getInstance();
        pipelineNode.getChildren().push(pipelineItem);
        pipelineItem.getChildren().push(pipelinerunItem);
        pipelinerunItem.getChildren().push(taskrunItem);
        taskrunItem.getChildren().push(taskItem);
        const pipelineNodes = await tektonInstance.getChildren();
        expect(pipelineNodes.length).equals(3);
        pipelineNodes.forEach((value) => 
        expect(value.getName()).oneOf(["Pipelines", "Tasks", "ClusterTasks"]));
        const pipelinetest = await tektonInstance.getChildren(pipelineNode);
        expect(pipelinetest[0]).equals(pipelineItem);
        const taskruns = await tektonInstance.getChildren(pipelinerunItem);
        expect(taskruns[0]).equals(taskrunItem);
        expect(tektonInstance.getParent(pipelinerunItem)).equals(pipelineItem);
        expect(tektonInstance.getTreeItem(taskrunItem)).equals(taskrunItem);
    });

});