/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { SideBarView, ActivityBar, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { views } from '../common/constants';

export function extensionActivityTest() : void{

  describe('Tekton Activity Test', () => {

    before(async function() {
      this.timeout(20000);
      await new EditorView().closeAllEditors();
    });

    it('Check Tekton Pipelines Exists', async function(){
      this.timeout(20000);
      const tektonPip = await new ActivityBar().getViewControl(views.TEKTON_TITLE);
      expect(tektonPip).not.undefined;
    });

    it('Check Tekton View Categories', async function(){
      this.timeout(20000);
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      const tektonCats = await new SideBarView().getContent().getSections();
      expect(tektonCats.length).equals(3);
      expect(await Promise.all(tektonCats.map(async item => await item.getTitle()))).to.has.members(views.TEKTON_CATS);
    });

    it('Check Tekton Pipelines Actions', async function(){
      this.timeout(20000);
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      const tektonPipSection = await new SideBarView().getContent().getSection(views.TEKTON_TITLE);
      await tektonPipSection.expand();
      expect(tektonPipSection.isExpanded());


      const actions = await tektonPipSection.getActions();
      expect(actions.length).greaterThan(0);
    });

    after(async function() {
      this.timeout(20000);
      await new EditorView().closeAllEditors();
    });
  });
}
