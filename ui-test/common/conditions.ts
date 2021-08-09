/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { Workbench, BottomBarPanel, TerminalView, InputBox, SideBarView, Input, ViewItem, CustomTreeItem, NotificationType, QuickPickItem, TreeItem, Notification } from 'vscode-extension-tester';

export async function notificationCenterIsOpened(): Promise<boolean> {
  try {
    const center = await new Workbench().openNotificationsCenter();
    return await center.isDisplayed();
  } catch (err) {
    //do not print err
    return false;
  }
}

export async function terminalChannelExists(text: string): Promise<string | null> {
  const terminalView = await new BottomBarPanel().openTerminalView();
  const names = await terminalView.getChannelNames();
  for (const name of names) {
    if (name.indexOf(text) >= 0) {
      return name;
    }
  }
  await terminalView.getDriver().sleep(2000);
  return null;
}

export async function outputChannelExists(text: string): Promise<string | null> {
  const outputView = await new BottomBarPanel().openOutputView();
  const names = await outputView.getChannelNames();
  for (const name of names) {
    if (name.indexOf(text) >= 0) {
      return name;
    }
  }
  await outputView.getDriver().sleep(2000);
  return null;
}

export async function terminalHasText(view: TerminalView, text: string, timePeriod = 2000): Promise<string | null> {
  await (await new Workbench().openNotificationsCenter()).clearAllNotifications();
  const currentText = await view.getText();
  if (currentText.indexOf(text) > -1) {
    return text;
  } else {
    await view.getDriver().sleep(timePeriod);
    return null;
  }
}

export async function inputHasNewMessage(input: InputBox, message: string, placeholder?: string): Promise<string | boolean> {
  const currentMessage = await input.getMessage();
  if (currentMessage && (currentMessage.includes(message))) {
    return true;
  }
  if (placeholder) {
    const currentHolder = await input.getPlaceHolder();
    return (placeholder !== currentHolder) && currentHolder;
  }
  return false;
}

export async function viewHasItems(): Promise<boolean> {
  try {
    const explorer = await new SideBarView().getContent().getSection('Tekton Pipelines');
    const items = await explorer.getVisibleItems();
    if (items.length > 0) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

export async function viewHasNoProgress(view: SideBarView): Promise<boolean> {
  const content = view.getContent();
  return !await content.hasProgress();
}

export async function inputHasQuickPicks(input: Input): Promise<QuickPickItem[] | null> {
  const picks = await input.getQuickPicks();
  if (picks.length > 0) {
    return picks;
  }
  return null;
}

export async function nodeHasNewChildren(node: CustomTreeItem, startChildren?: ViewItem[]): Promise<TreeItem[] | null>{
  try {
    if (!startChildren) {
      startChildren = await node.getChildren();
    }
    await node.getDriver().sleep(1000);
    const endChildren = await node.getChildren();
    if (startChildren.length === endChildren.length) {
      return null;
    }
    return endChildren;
  } catch (err) {
    await node.getDriver().sleep(500);
    return node.getChildren();
  }
}

export async function editorExists(title: string): Promise<boolean> {
  try {
    const titles = await new Workbench().getEditorView().getOpenEditorTitles();
    for (const titleFromTitles of titles) {
      if (titleFromTitles.indexOf(title) > -1) {
        return true;
      }
    }
    return false;
  } catch (err) {
    //do not print err
    return false;
  }
}


export async function getNotificationWithMessage(message: string): Promise<Notification | null>{
  try {
    const center = await new Workbench().openNotificationsCenter();
    const notifications = await center.getNotifications(NotificationType.Any);
    for (const item of notifications) {
      const text = await item.getMessage();
      if (text.indexOf(message) > -1) {
        return item;
      }
    }
    return null;
  } catch (err) {
    //do not print err
    return null;
  }
}
