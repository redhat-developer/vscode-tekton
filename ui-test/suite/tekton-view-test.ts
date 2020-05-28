/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { SideBarView, ActivityBar, WebDriver, VSBrowser, Workbench, CustomTreeSection, BottomBarPanel, ExtensionsViewItem, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { terminalHasText, viewHasItems } from '../common/conditions';
import { loginToOpenShiftWithTerminal, logoutFromOpenShiftWithTerminal } from '../common/utils';
import { commands, views } from '../common/constants';

export function tektonViewTest(clusterUrl: string, username: string, password: string): void {

  describe('Tekton View Test', () => {
    let driver: WebDriver;

    before(async function() {
      this.timeout(200000);
      driver = VSBrowser.instance.driver;
      await new EditorView().closeAllEditors();
      loginToOpenShiftWithTerminal(clusterUrl, username, password);

      const control = new ActivityBar().getViewControl(views.TEKTON_TITLE);
      await (await control).openView();
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
    });

    it('Check Tekton View', async function () {
      this.timeout(300000);
      const control = new ActivityBar().getViewControl(views.TEKTON_TITLE);
      await (await control).openView();
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
      await new SideBarView().getContent().getSection(views.TEKTON_TITLE);
      const tektonSection = await new SideBarView().getContent().getSection(views.TEKTON_TITLE) as CustomTreeSection;
      const items = await tektonSection.getVisibleItems();
      expect(items.length).equals(11);
    });

    it('Check Tekton: Tekton Version', async function() {
      this.timeout(300000);
      await new Workbench().executeCommand(commands.VERSION);
      driver.sleep(1000);
      const terminalView = await new BottomBarPanel().openTerminalView();
      await driver.wait(() => { return terminalHasText(terminalView, 'Client version:'); }, 200000);
      await terminalView.killTerminal();
    });

    it('Check Tekton: Refresh View command', async function () {
      this.timeout(300000);
      await new Workbench().executeCommand(commands.REFRESH);
      driver.sleep(1000);
      const control = await new ActivityBar().getViewControl(views.TEKTON_TITLE);
      await control.openView();
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
    });

    it('Check Tekton View Items', async function () {
      this.timeout(200000);
      const control = await new ActivityBar().getViewControl(views.TEKTON_TITLE);
      await control.openView();
      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
      await new SideBarView().getContent().getSection(views.TEKTON_TITLE);
      const tektonSection = await new SideBarView().getContent().getSection(views.TEKTON_TITLE) as CustomTreeSection;
      const tektonItems = ['Pipelines', 'PipelineRuns', 'Tasks', 'ClusterTasks', 'TaskRuns', 'PipelineResources', 'TriggerTemplates', 'TriggerBinding', 'EventListener', 'Conditions', 'ClusterTriggerBinding'];
      for (const item of tektonItems) {
        const itemPipelines = await tektonSection.findItem(item) as unknown as ExtensionsViewItem;
        expect(itemPipelines).not.undefined;
      }
    });

    after(async function() {
      this.timeout(200000);
      await logoutFromOpenShiftWithTerminal();
      await new EditorView().closeAllEditors();
    });

  });
}
