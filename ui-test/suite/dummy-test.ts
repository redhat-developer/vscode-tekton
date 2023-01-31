/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { expect } from 'chai';

export function dummyTest(): void {
  describe('Dummy public tests', () => {
    it('My Concrete dummy test', () => {
      expect(1).to.be.true;
    })
  });
}
