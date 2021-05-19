/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { hideClusterInfo, hideIPAddress, hidePath } from '../../src/util/hideclusterinformation';

const expect = chai.expect;
chai.use(sinonChai);

suite('Hide user information', () => {

  const ipAddress = 'undefinedUnable to connect to the server: dial tcp 192.168.1.240:6443: connect: no route to host 192.168.1.240:6443 2001:0000:3238:DFE1:63::FEFB 2001:0:3238:DFE1:63::FEFB';

  const userPath = `undefinedUnable to connect to the server: error executing access token command "C:\\!Users\\test\\AppData\\Local\\test-code\\installer\\test-cloud-sdk\\bin\\test.cmd config config-helper --format=json": err=exec: "C:\\Users\test\\AppData\\Local\\test-code\\installer\\test-cloud-sdk\\₭ǝ℞ᖭ\\₭ǝ℞ᖭ.cmd": file does not exist output= stderr=
  "/₭℞ᖭ/apple/₭℞ᖭ/"      "./test/test" "test/test2" "test" `;

  const hideClusterData = 'undefinedUnable to connect to the server: dial tcp 192.168.1.240:6443: connect: no route to host 192.168.1.240:6443 2001:0000:3238:DFE1:63::FEFB  https://test.com     connect to the server: dial tcp: lookup https://test.com:10.10.20.30: no such host';

  test('hide cluster information', async () => {
    const result = hideClusterInfo(hideClusterData);
    expect(result).deep.equals('undefinedUnable to connect to the server: dial tcp IP Address :6443: connect: no route to host IP Address :6443 IPV6 Address   cluster info      connect to the server: dial tcp: lookup cluster info:  no such host');
  });

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

  test('Hide user ipAddress', async () => {
    const result = hideIPAddress(ipAddress);
    expect(result).deep.equals('undefinedUnable to connect to the server: dial tcp IP Address :6443: connect: no route to host IP Address :6443 IPV6 Address  IPV6 Address ');
  });

  test('return string if user ipAddress not found', async () => {
    const message = 'undefinedUnable to connect to the server: dial tcp connect: no route to host';
    const result = hideIPAddress(message);
    expect(result).deep.equals(message);
  });
});
