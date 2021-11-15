/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import './task.css';
import { ResourceData, ResourceVersionData, Versions } from '../../tekton-hub-client';
import { createDiv, createSpan } from '../common/dom-util';
import { BaseWidget } from '../common/widget';
import { VSMessage } from '../common/vscode-api';
import * as hljs from 'highlight.js/lib/core';
import { HubResourceInstallation, HubResourceUninstall, InstalledResource, isInstalledTask } from '../../hub/hub-common';
import * as yaml from 'highlight.js/lib/languages/yaml';
import {CodeLineNumbers} from 'code-line-numbers';
import * as semver from 'semver';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const taskSvg = require('../hub/task.svg');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pipelineSvg = require('../hub/pipeline.svg');

import * as MarkdownIt from 'markdown-it';
import './yaml-highlight.css';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
hljs.registerLanguage('yaml', yaml as any);



export class TaskWidget extends BaseWidget {

  private task: ResourceData;
  private currentVersion: ResourceVersionData;
  private md: MarkdownIt;
  private readmePage: HTMLDivElement;
  private yamlPage: HTMLDivElement;
  private versionsSelect: HTMLSelectElement;
  private versions: Versions | undefined;
  private tknVersion: string | undefined;
  private installButton: HTMLAnchorElement;

  constructor(private root: HTMLElement, private messageSender: VSMessage) {
    super();
    this.element = createDiv('task-page');
    root.appendChild(this.element);
    this.md = new MarkdownIt();
  }

  showTask(task: ResourceData | InstalledResource, tknVersion: string): void {
    this.task = task;
    if (isInstalledTask(task)){
      this.currentVersion = task.installedVersion;
    } else {
      this.currentVersion = task.latestVersion;
    }
    this.versions = undefined;
    this.tknVersion = tknVersion;
    this.updatePage();
  }

  setVersions(versions: Versions): void {
    this.versions = versions;
    this.fillVersions(this.currentVersion);

  }

  private fillVersions(currentVersion: ResourceVersionData): void {
    for (const ver of this.versions.versions){
      const opt = document.createElement('option');
      opt.value = ver.version;
      console.error(this.task);
      if (ver.version === this.task.latestVersion.version){
        opt.text = ver.version + ' (latest)';
      } else {
        opt.text = ver.version;
      }
    
      if (currentVersion.version === ver.version){
        opt.selected = true;
      }
      this.versionsSelect.add(opt);
    }
  }

  private updatePage(): void {
    this.element.innerHTML = '';
    const header = createDiv('header');
    this.element.appendChild(header);
    const body = createDiv('body');
    this.element.appendChild(body);
    this.createHeader(header);
    this.createBody(body);
  }

  private createHeader(header: HTMLDivElement): void {
    const iconContainer = createDiv('icon-container');
    const image = document.createElement('img');
    image.src = this.task.kind === 'Task' ? taskSvg : pipelineSvg;
    image.classList.add('icon');
    iconContainer.appendChild(image);
    header.appendChild(iconContainer);

    const details = createDiv('details');
    header.appendChild(details);

    const title = createDiv('title');
    details.appendChild(title);
    
    const name = document.createElement('a');
    name.classList.add('name');
    title.appendChild(name);
    name.textContent = this.currentVersion.displayName ? this.currentVersion.displayName : this.task.name;
    name.href = `https://hub.tekton.dev/${this.task.catalog.name}/task/${this.task.name}`;

    const subtitle = createDiv('subtitle');
    details.appendChild(subtitle);

    // Catalog
    const catalogContainer = createDiv('subtitle-entry');
    subtitle.appendChild(catalogContainer);
    const catalog = createSpan('catalog');
    catalogContainer.appendChild(catalog);
    catalog.textContent = this.task.catalog.name;

    // Ratings
    const ratingsContainer = createDiv('subtitle-entry');
    subtitle.appendChild(ratingsContainer);
    const ratings = createSpan('rating');
    ratingsContainer.appendChild(ratings);

    const star = createSpan('codicon', 'codicon-star-full');
    ratings.appendChild(star);
    const count = createSpan('count');
    count.innerText = this.task.rating.toString();
    ratings.appendChild(count);

    // Repository
    const repositoryContainer = createDiv('subtitle-entry');
    const repolink = document.createElement('a');
    repolink.href = this.currentVersion.webURL;
    repolink.textContent = 'Repository';
    repolink.classList.add('repository');
    repositoryContainer.appendChild(repolink);
    subtitle.appendChild(repositoryContainer);

    //Description
    const description = createDiv('description');
    description.textContent = this.currentVersion.description ? this.currentVersion.description?.split('\n')[0] : this.task.latestVersion.description?.split('\n')[0];
    details.appendChild(description);

    //Actions

    const actions = createDiv('actions');
    const actionBar = createDiv('action-bar');
    actions.appendChild(actionBar);
    const actionsContainer = document.createElement('ul');
    actionsContainer.classList.add('actions-container');
    actionBar.appendChild(actionsContainer);

    // Versions Select
    const versionsLi = document.createElement('li');
    versionsLi.classList.add('action-item');
    this.versionsSelect = document.createElement('select');
    this.versionsSelect.classList.add('extension-action', 'versions-select');

    versionsLi.appendChild(this.versionsSelect);
    actionsContainer.appendChild(versionsLi);

    if (!this.versions) {
      this.messageSender.postMessage({type:'getVersions', data: this.task.id})
    } else {
      this.fillVersions(this.currentVersion);
    }
    this.versionsSelect.onchange = () => {
      this.versionChanged(this.versionsSelect.selectedOptions.item(0).value);
    };

    // install button
    if (!isInstalledTask(this.task) || this.currentVersion.version !== this.task.installedVersion.version){
      this.addInstallButton(actionsContainer);
    } else {
      this.addUninstallButton(actionsContainer);
    }

    // TKN Version
    if (this.tknVersion){
      this.addVersionCheck(actionsContainer);
    }

    if (isInstalledTask(this.task) && this.task.clusterTask) {
      const clusterTaskContainer = document.createElement('li');
      clusterTaskContainer.classList.add('action-item');
      const clusterTaskLabel = createSpan('cluster-task-label');
      clusterTaskLabel.textContent = 'ClusterTask';
      clusterTaskContainer.appendChild(clusterTaskLabel);
      actionsContainer.appendChild(clusterTaskContainer);
    }

    details.appendChild(actions);

  }

  private addInstallButton(actionsContainer: HTMLUListElement): void {
    const installLi = document.createElement('li');
    installLi.classList.add('action-item', 'action-dropdown-item');
    const installButton = document.createElement('a');
    installButton.classList.add('action-label', 'codicon', 'extension-action', 'label', 'uninstall', 'action-dropdown');
    installButton.textContent = 'Install';
    installButton.onclick = () => {
      if (installButton.textContent !== 'Install') {
        return;
      }
      this.sendInstall();
      installButton.textContent = 'Installing';
    }
    this.installButton = installButton;
    installLi.appendChild(installButton);

    if (this.task.kind === 'Task'){
      const tknDropdown = createDiv('monaco-dropdown');
      const dropdownLabel = createDiv('dropdown-label');
      const dropdownButton = document.createElement('a');
      dropdownButton.classList.add('action-label', 'dropdown', 'codicon-chevron-down', 'extension-action', 'label', 'action-dropdown', 'codicon');
      dropdownButton.onclick = (e) => {
        e.stopPropagation();
        this.showInstallOptions(dropdownButton);
      }
      dropdownLabel.appendChild(dropdownButton);
      tknDropdown.appendChild(dropdownLabel);
      installLi.appendChild(tknDropdown);
    }
    actionsContainer.appendChild(installLi);
  }

  private addUninstallButton(actionsContainer: HTMLUListElement): void {
    const uninstallLi = document.createElement('li');
    uninstallLi.classList.add('action-item');
    const uninstallButton = document.createElement('a');
    uninstallButton.classList.add('action-label', 'codicon', 'extension-action', 'label', 'uninstall');
    uninstallButton.textContent = 'Uninstall';
    uninstallButton.onclick = () => {
      if (uninstallButton.textContent !== 'Uninstall'){
        return;
      }
      this.sendUninstall();
      uninstallButton.textContent = 'Uninstalling';
    }
    uninstallLi.appendChild(uninstallButton);
    actionsContainer.appendChild(uninstallLi);
  }

  private sendInstall(asCluster = false): void {
    this.messageSender.postMessage({type: 'installTask', data: {
      url: this.currentVersion.rawURL,
      name: this.task.name,
      minPipelinesVersion: this.currentVersion.minPipelinesVersion,
      tknVersion: this.tknVersion,
      asClusterTask: asCluster,
      kind: this.task.kind,
      resourceVersion: this.currentVersion,
      view: ''
    } as HubResourceInstallation});
  }

  private sendUninstall(): void {
    if (isInstalledTask(this.task)) {
      this.messageSender.postMessage({type: 'uninstallTask', data: {
        clusterTask: this.task.clusterTask,
        name: this.task.name,
        kind: this.task.kind,
      } as HubResourceUninstall});
    }
  }

  private showInstallOptions(parent: HTMLAnchorElement): void {
    const rmenu = document.getElementById('rmenu');
    rmenu.className = 'show';
    rmenu.style.top = parent.getBoundingClientRect().bottom + 'px';
    rmenu.style.left = parent.getBoundingClientRect().left + 'px';
    rmenu.innerHTML = '';

    const installCluster = document.createElement('a');
    installCluster.text = 'Install as ClusterTask';
    rmenu.appendChild(installCluster);

    installCluster.onclick = () => {
      this.sendInstall(true);
      document.getElementById('rmenu').className = 'hide';
    }

    const docClickListener = (): void => {
      document.getElementById('rmenu').className = 'hide';
      document.removeEventListener('click',docClickListener);
    };
    document.addEventListener('click', docClickListener);

  }

  private addVersionCheck(container: HTMLUListElement): void {
    if (this.currentVersion.minPipelinesVersion) {
      if (semver.lt(this.tknVersion, this.currentVersion.minPipelinesVersion)){
        const versionWarning = document.createElement('li');
        versionWarning.classList.add('action-item');
        
        const warning = createSpan('action-label', 'codicon', 'warning');
        warning.textContent = 'Incompatible';
        warning.title = `This task requires Tekton Pipelines >= ${this.task.latestVersion.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster.`;
        versionWarning.appendChild(warning);
        container.appendChild(versionWarning);
    
      }
    }
  }

  private createBody(body: HTMLDivElement): void {
    const navbar = createDiv('navbar');
    body.appendChild(navbar);

    this.createNavButtons(navbar);

    const content = createDiv('content');
    body.appendChild(content);


    this.readmePage = createDiv('page');
    content.appendChild(this.readmePage);
    // readmePage.hidden = true;
    this.renderReadme(this.readmePage);

    this.yamlPage = createDiv('page');
    this.yamlPage.hidden = true;
    content.appendChild(this.yamlPage);
    this.renderYaml(this.yamlPage);
  }

  private createNavButtons(navbar: HTMLDivElement): void {
    const actionBar = createDiv('action-bar');
    navbar.appendChild(actionBar);
    const actionContainer = document.createElement('ul');
    actionContainer.className = 'actions-container';
    actionBar.appendChild(actionContainer);

    const readmeAction = document.createElement('li');
    readmeAction.className = 'action-item';
    actionContainer.appendChild(readmeAction);
    const reademA = document.createElement('a');

    reademA.classList.add('action-label', 'checked');
    reademA.textContent = 'Description';
    readmeAction.appendChild(reademA);

    const yamlAction = document.createElement('li');
    yamlAction.className = 'action-item';
    actionContainer.appendChild(yamlAction);
    const yamlA = document.createElement('a');
    yamlA.classList.add('action-label');
    yamlA.textContent = 'YAML';
    yamlAction.appendChild(yamlA);

    reademA.onclick = () => {
      this.switchPages(this.readmePage, this.yamlPage, reademA, yamlA);
    }

    yamlA.onclick = () => {
      this.switchPages(this.yamlPage, this.readmePage, yamlA , reademA);
    }
  }

  private switchPages(newActivePage: HTMLDivElement, activePage: HTMLDivElement, newActiveButton: HTMLAnchorElement, activeButton: HTMLAnchorElement): void {
    activePage.hidden = true;
    activeButton.classList.remove('checked');
    newActivePage.hidden = false;
    newActiveButton.classList.add('checked');
  }

  private async renderReadme(content: HTMLDivElement): Promise<void> {

    let readmeUrl = this.currentVersion.rawURL;
    readmeUrl = readmeUrl.substring(0, readmeUrl.lastIndexOf('/'));
    readmeUrl = readmeUrl + '/README.md';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', readmeUrl);
    xhr.send();
    xhr.onload = () => {
      content.innerHTML = this.md.render(xhr.response);
    }

    xhr.onerror = () => {
      console.error(`Cannot load README.md -> ${xhr.status}: ${xhr.statusText}`);
    }
  }

  private async renderYaml(content: HTMLDivElement): Promise<void> {

    const yamlUrl = this.currentVersion.rawURL;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', yamlUrl);
    xhr.send();
    xhr.onload = () => {
      content.innerHTML = '';
      const pre = document.createElement('pre');
      content.appendChild(pre);
      const code = document.createElement('code');
      code.classList.add('language-yaml');
      pre.appendChild(code);
      code.innerHTML = hljs.highlight('yaml', xhr.response).value;
      CodeLineNumbers.addLineNumbersTo(code);
    }

    xhr.onerror = () => {
      console.error(`Cannot load README.md -> ${xhr.status}: ${xhr.statusText}`);
    }
  }

  private versionChanged(versionId: string): void {
    for (const ver of this.versions.versions) {
      if (versionId === ver.version){
        this.messageSender.postMessage({type: 'getTask', data: ver.id})
        return;
      }
    }

    
  }

  setTaskVersion(task: ResourceVersionData): void {
    this.currentVersion = task;
    this.updatePage();
  }

  cancelInstall(): void {
    this.installButton.textContent = 'Install';
  }
}
