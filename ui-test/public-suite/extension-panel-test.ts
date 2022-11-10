/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { SideBarView, ActivityBar, WebDriver, VSBrowser, CustomTreeSection, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { viewHasItems } from '../common/conditions';
import { views } from '../common/constants';

export function extensionPanelTest() : void{

  describe('Tekton Panel Test', () => {
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
      const tektonPipCat = await tektonCats[0].getTagName();
      expect(tektonCats.length).equals(3);
      expect(tektonPipCat).equals(views.TEKTON_TITLE);
    });

    it('Check Tekton Pipelines Buttons', async function(){
      this.timeout(300000);
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
      const tektonPipSection = await new SideBarView().getContent().getSection(views.TEKTON_TITLE) as CustomTreeSection;
      //const items = await tektonPipSection.getVisibleItems();
      //const buttons = await items[0].getActionButtons();
      //something, what are the items?
      const pipButton = await tektonPipSection.findItem('Tekton pipeline');
      const triggerButton = await tektonPipSection.findItem('Tekton Trigger');
      expect(pipButton).not.undefined;
      expect(triggerButton).not.undefined;
    });

    after(async function() {
      this.timeout(200000);
      await new EditorView().closeAllEditors();
    });
  });
}
