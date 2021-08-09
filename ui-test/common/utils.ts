/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { Workbench, VSBrowser, BottomBarPanel, InputBox } from 'vscode-extension-tester';
import { notificationCenterIsOpened, inputHasNewMessage, terminalHasText} from './conditions';

export async function loginToOpenShiftWithTerminal(clusterUrl: string, username: string, password: string): Promise<void> {
  const terminalView = await new BottomBarPanel().openTerminalView();
  await terminalView.executeCommand('rm -f .kube/config');
  await terminalView.executeCommand(`oc login --username=${username} --password=${password} --server=${clusterUrl} --insecure-skip-tls-verify`);

  await terminalView.executeCommand('oc new-project test-tekton');
  await terminalHasText(terminalView, 'Login successful.');
  await terminalView.killTerminal();
}

export async function logoutFromOpenShiftWithTerminal(): Promise<void> {
  const bottomBar = new BottomBarPanel();
  await bottomBar.toggle(true);
  const terminalView = await bottomBar.openTerminalView();
  await terminalView.executeCommand('oc delete project test-tekton');
  await terminalView.executeCommand('oc logout');
  await terminalHasText(terminalView, 'Logged');
  await terminalView.killTerminal();
}

export async function clearNotifications(): Promise<void> {
  const driver = VSBrowser.instance.driver;
  try {
    const center = await new Workbench().openNotificationsCenter();
    await driver.wait(() => { return notificationCenterIsOpened(); }, 10000);
    await center.clearAllNotifications();
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function getTextFromTerminal(): Promise<string> {
  const terminalView = await new BottomBarPanel().openTerminalView();
  await terminalView.selectChannel('Tekton');
  return await terminalView.getText();
}

export async function getTextFromOutput(): Promise<string> {
  const outputView = await new BottomBarPanel().openOutputView();
  await outputView.selectChannel('Tekton Pipelines');
  return await outputView.getText();
}

export async function setInputTextAndConfirm(text?: string, shouldWait = false): Promise<void> {
  const input = await new InputBox().wait();
  const message = await input.getMessage();
  const holder = await input.getPlaceHolder();

  if (text) { await input.setText(text); }
  await input.confirm();

  if (shouldWait) {
    await input.getDriver().wait(() => { return inputHasNewMessage(input, message, holder); }, 3000);
  }
}

export async function inputConfirm(shouldWait = false): Promise<void> {
  const input = await new InputBox().wait();
  const message = await input.getMessage();
  const holder = await input.getPlaceHolder();
  await input.confirm();

  if (shouldWait) {
    await input.getDriver().wait(() => { return inputHasNewMessage(input, message, holder); }, 3000);
  }
}
