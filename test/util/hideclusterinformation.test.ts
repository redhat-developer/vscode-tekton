/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { hidePath } from '../../src/util/hideclusterinformation';

const expect = chai.expect;
chai.use(sinonChai);

suite('Hide user information', () => {

  const userPath = `undefinedUnable to connect to the server: error executing access token command "C:\\!Users\\test\\AppData\\Local\\test-code\\installer\\test-cloud-sdk\\bin\\test.cmd config config-helper --format=json": err=exec: "C:\\Users\test\\AppData\\Local\\test-code\\installer\\test-cloud-sdk\\₭ǝ℞ᖭ\\₭ǝ℞ᖭ.cmd": file does not exist output= stderr=
  "/₭℞ᖭ/apple/₭℞ᖭ/"      "./test/test" "test/test2" "test" `;

  test('Hide local user path', async () => {
    const result = hidePath(userPath);
    expect(result).deep.equals(`undefinedUnable to connect to the server: error executing access token command "local path": err=exec: "local path": file does not exist output= stderr=
  "local path"      "local path" "local path" "test" `);
  });

  test('return string if local user path not found', async () => {
    const message = 'undefinedUnable to connect to the server: error executing access token command';
    const result = hidePath(message);
    expect(result).deep.equals(message);
  });
});
