/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknSchemeStorage } from '../../src/yaml-support/tkn-scheme-storage';

const expect = chai.expect;
chai.use(sinonChai);

suite('Scheme storage', () => {
    let sandbox: sinon.SinonSandbox;
    let schemeStorage: TknSchemeStorage;
    setup(() => {
        sandbox = sinon.createSandbox();
        schemeStorage = new TknSchemeStorage();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should call generator', async () => {
        const doc = { getText: () => 'Some text', version: 1, uri: vscode.Uri.parse('file:///fos/bar.yaml') } as vscode.TextDocument;
        const generator = sinon.fake.resolves('Foo');

        const result = await schemeStorage.getScheme(doc, generator);
        expect(result).equal('Foo');
        expect(generator.calledOnce).to.be.true;
    });

    test('should check version', async () => {
        const doc = { getText: () => 'Some text', version: 1, uri: vscode.Uri.parse('file:///fos/bar.yaml') } as vscode.TextDocument;
        const generator = sinon.fake.resolves('Foo');

        const result = await schemeStorage.getScheme(doc, generator);
        const secondResult = await schemeStorage.getScheme(doc, generator);

        expect(result).equal('Foo');
        expect(generator.calledOnce).to.be.true;
        expect(secondResult).equal('Foo');
    });

    test('should call generator if version changed', async () => {
        const doc = { getText: () => 'Some text', version: 1, uri: vscode.Uri.parse('file:///fos/bar.yaml') } as vscode.TextDocument;
        const generator = sinon.fake.resolves('Foo');

        const result = await schemeStorage.getScheme(doc, generator);
        const doc2 = { getText: () => 'Some text', version: 2, uri: vscode.Uri.parse('file:///fos/bar.yaml') } as vscode.TextDocument;

        const secondResult = await schemeStorage.getScheme(doc2, generator);

        expect(result).equal('Foo');
        expect(generator.calledTwice).to.be.true;
        expect(secondResult).equal('Foo');
    });

});
