/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { ActivityBar, WebDriver, VSBrowser, Workbench, BottomBarPanel, EditorView } from 'vscode-extension-tester';
import * as path from 'path';
import { viewHasItems, terminalHasText, getNotificationWithMessage} from '../common/conditions';
import { setInputTextAndConfirm, loginToOpenShiftWithTerminal, logoutFromOpenShiftWithTerminal, inputConfirm } from '../common/utils';
import { commands, views } from '../common/constants';

export function taskTest(clusterUrl: string, username: string, password: string): void {
  describe('Task tests', () => {
    let driver: WebDriver;
    const simpleTaskFile = 'simple-task.yaml';
    const taskName = 'echo-hello-world';

    before(async function() {
      this.timeout(200000);
      driver = VSBrowser.instance.driver;
      await new EditorView().closeAllEditors();
      await loginToOpenShiftWithTerminal(clusterUrl, username, password);

      await (await new ActivityBar().getViewControl(views.TEKTON_TITLE)).openView();
      await driver.wait(() => { return viewHasItems(); }, 200000);
    });
    
    it('Create task', async function() {
      this.timeout(200000);
      const terminalView = await new BottomBarPanel().openTerminalView();
      await terminalView.executeCommand('kubectl apply -f ' + await getFilePath(simpleTaskFile));
      await driver.wait(() => { return terminalHasText(terminalView, 'configured'); }, 200000);
      await terminalView.killTerminal();
    });

    it('Start task', async function() {
      this.timeout(400000);
      await new Workbench().executeCommand(commands.START_TASK);
      await setInputTextAndConfirm(taskName, false);
      await driver.wait(() => { return getNotificationWithMessage('Task successfully started'); }, 20000);
    });

    it('List task run', async function() {
      this.timeout(400000);
      await new Workbench().executeCommand(commands.LIST_TASK_RUN);
      await setInputTextAndConfirm(taskName, false);
      const bottomBar = new BottomBarPanel();
      const terminalView = await bottomBar.openTerminalView();
      await driver.wait(() => { return terminalHasText(terminalView, 'STARTED'); }, 200000);
      await terminalView.killTerminal();
    });

    it('Show Task Run Logs', async function() {
      this.timeout(400000);
      await new Workbench().executeCommand(commands.SHOW_TASK_RUN_LOGS);
      await inputConfirm(false);
      const bottomBar = new BottomBarPanel();
      const terminalView = await bottomBar.openTerminalView();
      await driver.wait(() => { return terminalHasText(terminalView, 'tkn taskrun logs'); }, 200000);
      await terminalView.killTerminal();
    });

    after(async function() {
      this.timeout(200000);
      await logoutFromOpenShiftWithTerminal();
      await new EditorView().closeAllEditors();
    });

  });
}

async function getFilePath(file: string): Promise<string> {
  const resources = path.resolve('ui-test', 'resources');
  return path.join(resources, file);
}
