/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { SideBarView, ActivityBar, WebDriver, VSBrowser, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { viewHasItems } from '../common/conditions';
import { views } from '../common/constants';

export function extensionActivityTest() : void{

  describe('Tekton Activity Test', () => {
    let driver: WebDriver;

    before(async function() {
      this.timeout(200000);
      driver = VSBrowser.instance.driver;
      await new EditorView().closeAllEditors();
    });

    it('Check Tekton Pipelines Exists', async function(){
      this.timeout(300000);
      const tektonPip = await new ActivityBar().getViewControl(views.TEKTON_TITLE);
      expect(tektonPip).not.undefined;
    });

    it('Check Tekton View Categories', async function(){
      this.timeout(300000);
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
      const tektonCats = await new SideBarView().getContent().getSections();
      expect(tektonCats.length).equals(3);

      for (let i = 0; i < tektonCats.length; i++){
        expect(await tektonCats[i].getTitle()).equals(views.TEKTON_CATS[i]);       
      }
    });

    it('Check Tekton Pipelines Actions', async function(){
      this.timeout(300000);
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
      const tektonPipSection = await new SideBarView().getContent().getSection(views.TEKTON_TITLE);
      await tektonPipSection.expand();
      expect(tektonPipSection.isExpanded());

      const actions = await tektonPipSection.getActions();
      expect(actions.length).equals(4);

      const version = await tektonPipSection.getAction('Tekton Version');
      expect(version).is.not.undefined;
    });

    after(async function() {
      this.timeout(200000);
      await new EditorView().closeAllEditors();
    });
  });
}
