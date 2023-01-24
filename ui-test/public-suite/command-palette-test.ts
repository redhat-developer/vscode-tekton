/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { InputBox, Workbench, WebDriver, VSBrowser, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';

export function commandPaletteTest() : void{

  describe('Tekton Command Palette Test', () => {
    let driver: WebDriver;

    before(async function() {
      this.timeout(200000);
      driver = VSBrowser.instance.driver;
      await new EditorView().closeAllEditors();
    });

    it('Search Tekton', async function(){
      this.timeout(300000);
      await new Workbench().openCommandPrompt();
      const paletteInput = await InputBox.create();
      await paletteInput.setText('> tekton');

      const tektonPicks = await paletteInput.getQuickPicks();
      expect(tektonPicks).not.empty;
    });

    after(async function() {
      this.timeout(200000);
      await new EditorView().closeAllEditors();
    });
  });
}
