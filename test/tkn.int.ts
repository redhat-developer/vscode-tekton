/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as tkn from '../src/tkn';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { Pipeline } from '../src/tekton/pipeline';

suite('tkn integration', () => {
    const tk: tkn.Tkn = tkn.getInstance();
    let sb: sinon.SinonSandbox;

    setup(() => {
        sb = sinon.createSandbox();
        sb.stub(vscode.window, 'showInformationMessage').resolves('Download and install');
    });

    teardown(() => {
        sb.restore();
    });

    suite('explorer', ()=> {

        test('getPipelines()', async () => {
            const pipelines = await tk.getPipelines();
            assert.ok(pipelines.length > 0);
        });

        test('getPipelines()', async () => {
            const pipelines = await tk.getPipelines();
            assert.ok(pipelines.length > 0);
        });

        test('about()', async () => {
            await Pipeline.about();
            assert.ok(true);
        });
    });
});
