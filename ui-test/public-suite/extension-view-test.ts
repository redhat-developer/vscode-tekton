/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { ActivityBar, WebDriver, VSBrowser, EditorView, ExtensionsViewItem } from 'vscode-extension-tester';
import { expect } from 'chai';

export function extensionViewTest() : void{

  describe('Tekton Extension View Test', () => {
    let driver: WebDriver;

    before(async function() {
      this.timeout(200000);
      driver = VSBrowser.instance.driver;
      await new EditorView().closeAllEditors();
    });

    it('Check Tekton Installation And Information', async function(){
      this.timeout(300000);
      const extensionView = await (await new ActivityBar().getViewControl('Extensions')).openView();
      const installedSection = await extensionView.getContent().getSection('Installed');
      const tektonItem = await installedSection.findItem('@installed Tekton Pipelines') as ExtensionsViewItem;
      expect(tektonItem).not.undefined;

      const tektonTitle = await tektonItem.getTitle();
      const tektonInstalled = await tektonItem.isInstalled();
      const tektonAuthor = await tektonItem.getAuthor();
      expect(tektonTitle).equals('Tekton Pipelines');
      expect(tektonInstalled).is.true;
      expect(tektonAuthor).equals('Red Hat');
    });

    after(async function() {
      this.timeout(200000);
      await new EditorView().closeAllEditors();
    });
  });
}
