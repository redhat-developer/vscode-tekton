/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { InputBox, Workbench, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';

export function commandPaletteTest() : void{

  describe('Tekton Command Palette Test', () => {

    before(async function() {
      this.timeout(20000);
      await new EditorView().closeAllEditors();
    });

    it('Search Tekton', async function(){
      this.timeout(20000);
      await new Workbench().openCommandPrompt();
      const paletteInput = await InputBox.create();
      await paletteInput.setText('> tekton');

      const tektonPicks = await paletteInput.getQuickPicks();
      expect(tektonPicks).not.empty;
    });

    after(async function() {
      this.timeout(20000);
      await new EditorView().closeAllEditors();
    });
  });
}
