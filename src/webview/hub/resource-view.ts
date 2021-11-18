/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import './hub.css';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const taskSvg = require('./task.svg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pipelineSvg = require('./pipeline.svg');
import { VSMessage, ViewState} from '../common/vscode-api';
import { debounce } from 'debounce';
import {ResourceData} from '../../tekton-hub-client/api';
import { BaseWidget, Listener, Widget } from '../common/widget';
import { CollapsibleList, CollapsibleListState, ListWidget } from '../common/list-widget';
import { createDiv, createSpan } from '../common/dom-util';
import * as semver from 'semver';
import { HubResource, HubResourceInstallation, InstalledResource, isInstalledTask } from '../../hub/hub-common';
import { Loader } from '../common/loader';
import { dropDownForTags, enterEvent, hideList, initList, keyUpDown, listGroup } from './search_dropdown';

let installingButton;
export class SearchInput {

  private inputListener: Listener<string> | undefined;

  constructor(private input: HTMLInputElement, private messageSender: VSMessage){
    this.input.oninput = debounce(this.inputChange.bind(this));
  }

  private inputChange(): void {
    if (this.inputListener) {
      this.inputListener(this.input.value);
    }
  }

  disable(): void {
    this.input.disabled = true;
  }

  get inputElement(): HTMLInputElement {
    return this.input;
  }

  onInputChange(listener: Listener<string>): void {
    this.inputListener = listener;
  }

  get value(): string {
    return this.input.value;
  }

  setValue(value: string): void {
    this.input.value = value;
  }
}

export class ResourceItem extends BaseWidget {

  
  constructor(private task: HubResource, icon: string, private messageSender: VSMessage, private loader: Loader, private viewType: string, private tknVersion?: string) {
    super();
    this.element = createDiv('task-list-item');
    const iconContainer = createDiv('icon-container');
    this.element.appendChild(iconContainer);
    const image = document.createElement('img');
    image.src = icon;
    image.classList.add('icon');
    iconContainer.appendChild(image);
    this.createDetails();
    this.element.onclick = () => {
      try {
        this.task.view = this.viewType;
        this.messageSender.postMessage({type: 'openTaskPage', data: this.task});
      } catch (err) {
        console.error(err);
      }
    }
  }

  private createDetails(): void {
    const details = createDiv('details');
    this.element.appendChild(details);
    
    this.createHeader(details);

    this.createDescription(details);
    this.createFooter(details);
    
  }

  private createHeader(details: HTMLDivElement): void {
    const headerContainer = createDiv('header-container');
    details.appendChild(headerContainer);

    const header = createDiv('header');
    const name = createSpan('name');
    name.innerText = this.task.latestVersion?.displayName ? this.task.latestVersion.displayName : this.task.name;
    header.appendChild(name);

    const version = createSpan('version');
    version.innerText = this.task.latestVersion ? this.task.latestVersion.version : (this.task as InstalledResource).installedVersion.version;
    header.appendChild(version);

    const ratings = createSpan('ratings');
    const star = createSpan('codicon', 'codicon-star-full');
    ratings.appendChild(star);
    const count = createSpan('count');
    count.innerText = this.task.rating.toString();
    ratings.appendChild(count);
    header.appendChild(ratings);

    headerContainer.appendChild(header);
  }

  private createDescription(details: HTMLDivElement): void {
    const description = createDiv('description');
    description.classList.add('ellipsis');
    description.textContent = this.task.latestVersion ? this.task.latestVersion.description : (this.task as InstalledResource).installedVersion.description;
    details.appendChild(description);
  }

  private createFooter(details: HTMLDivElement): void {
    const footer = createDiv('footer');
    const author = createDiv('author');
    author.innerText = this.task.catalog.name;
    footer.appendChild(author);

    const actionBar = createDiv('list-action-bar');

    const actionContainer = document.createElement('ul');
    actionContainer.classList.add('actions-container');

    this.addIsClusterTask(actionContainer);

    if (this.tknVersion){
      this.addVersionCheck(actionContainer);
    }
    const installEl = document.createElement('li');
    installEl.classList.add('action-item');
    
    if (!(this.task as InstalledResource).installedVersion) {
      const installButton = document.createElement('a');
      installButton.classList.add('action-label', 'codicon', 'extension-action', 'install');
  
      installButton.textContent = 'Install';
      installButton.onclick = (e) =>{
        e.preventDefault();
        e.stopPropagation();
        if (installButton.textContent !== 'Install'){
          return;
        }

        this.sendInstall();
        installButton.textContent = 'Installing';
        installingButton = installButton;
      };
      installEl.appendChild(installButton);
    }

    actionContainer.appendChild(installEl);
    actionBar.appendChild(actionContainer);
    footer.appendChild(actionBar);
    details.appendChild(footer);
  }

  private sendInstall(): void {
    this.loader.show();
    this.messageSender.postMessage({type: 'installTask', data: {
      url: this.task.latestVersion.rawURL,
      name: this.task.name,
      minPipelinesVersion: this.task.latestVersion.minPipelinesVersion,
      tknVersion: this.tknVersion,
      resourceVersion: this.task.latestVersion,
      kind: this.task.kind,
      view: this.viewType,
      asClusterTask: false,
    } as HubResourceInstallation});
  }

  private addVersionCheck(container: HTMLUListElement): void {
    if (this.task.latestVersion && this.task.latestVersion.minPipelinesVersion) {
      if (semver.lt(this.tknVersion, this.task.latestVersion.minPipelinesVersion)){
        const versionWarning = document.createElement('li');
        versionWarning.classList.add('action-item');
        
        const warning = createSpan('codicon', 'codicon-warning', 'action-warning');
        warning.title = `This task requires Tekton Pipelines >= ${this.task.latestVersion.minPipelinesVersion} and is incompatible with the version of Tekton Pipelines installed on your cluster.`;
        versionWarning.appendChild(warning);
        container.appendChild(versionWarning);
    
      }
    }
  }

  private addIsClusterTask(container: HTMLUListElement): void {
    if (isInstalledTask(this.task) && this.task.clusterTask) {
      const clusterTaskContainer = document.createElement('li');
      clusterTaskContainer.classList.add('action-item');
      const clusterTaskLabel = createSpan('cluster-task-label');
      clusterTaskLabel.textContent = 'ClusterTask';
      clusterTaskContainer.appendChild(clusterTaskLabel);
      container.appendChild(clusterTaskContainer);
    }
  }

}

export class ResourceList extends ListWidget<HubResource> {

  tknVersion: string | undefined;

  constructor(element: HTMLElement, private messageSender: VSMessage, private loader: Loader, private type: string){
    super(element);
  }

  setErrorMessage(message: string): void {
    this.element.innerText = message;
  }

  createItemWidget(item: HubResource): Widget {
    return new ResourceItem(item, item.kind === 'Task' ? taskSvg : pipelineSvg, this.messageSender, this.loader, this.type, this.tknVersion);
  }

  show(items: HubResource[]): void {
    if (items.length === 0) {
      this.showPlaceholder('No resource found.');
      if (this.itemListChangedListener) {
        this.itemListChangedListener(items);
      }
    } else {
      super.show(items);
    }
  }

}

export class ResourceView {

  private searchInput: SearchInput;
  private taskList: ResourceList;
  private installedTasks: Map<string, InstalledResource>;
  private welcomeList: CollapsibleList<HubResource>;
  private mainContainer: HTMLElement;
  private loader: Loader;
  private installedList: ResourceList | undefined;
  private recommendedList: ResourceList | undefined;
  private state: TaskViewState;
  private searchTasks: ResourceData[];

  constructor(private vscodeAPI: VSMessage & ViewState) {
    this.searchInput = new SearchInput(document.getElementById('taskInput') as HTMLInputElement, vscodeAPI);
    this.searchInput.inputElement.addEventListener('keypress', (e) => {
      if (e.code === 'Enter') {
        enterEvent(e);
      }
      hideList(listGroup);
      initList();
    });
    this.searchInput.inputElement.addEventListener('click', () => {
      keyUpDown();
    });
    this.searchInput.onInputChange((input) => {
      if (input) {
        dropDownForTags(input);
        this.loader.show();
        this.vscodeAPI.postMessage({type: 'search', data: input});
      } else {
        hideList(listGroup);
        this.showWelcomeList();
      }
    });

    // Check if we have an old state to restore from
    this.state = vscodeAPI.getState() as TaskViewState;
    if (!this.state || !this.state.welcomeList){
      this.state = {input: undefined, welcomeList: {}};
    }

    this.loader = new Loader();
    const rootElement = document.getElementById('root')
    rootElement.insertBefore(this.loader.getElement(), rootElement.firstChild);
    this.loader.show();

    const taskListContainer = createDiv();
    taskListContainer.id = 'tasksList';
    taskListContainer.className = 'contain-style';
    this.taskList = new ResourceList(taskListContainer, this.vscodeAPI, this.loader, 'searchView');

    this.mainContainer = document.getElementById('mainContainer');
    const listContainer = createDiv('collapsibleListContainer');
    this.mainContainer.appendChild(listContainer);
    this.welcomeList = new CollapsibleList(listContainer, (state) => {
      this.state.welcomeList = state;
      this.vscodeAPI.setState(this.state);
    }, this.state.welcomeList);
    document.body.onresize = () => {
      this.welcomeList.updateLayout();
    }
  }

  setErrorState(message: string): void {
    this.loader.hide();
    this.searchInput.disable();
    this.taskList.setErrorMessage(message);
    if (!this.mainContainer.contains(this.taskList.getElement())){
      this.mainContainer.removeChild(this.welcomeList.getElement());
      this.mainContainer.appendChild(this.taskList.getElement());
    }
  }

  showTasks(tasks: ResourceData[]): void {
    this.loader.hide();
    if (this.searchInput.value){
      this.searchTasks = tasks;
      this.updateSearchList();
      this.mainContainer.removeChild(this.welcomeList.getElement());
      this.mainContainer.appendChild(this.taskList.getElement());
    } else {
      this.showWelcomeList();
    }
  }

  private updateSearchList(): void {
    if (this.installedTasks){
      for (const task of this.searchTasks){
        if (this.installedTasks.has(task.name) && this.installedTasks.get(task.name).kind === task.kind){
          (task as InstalledResource).installedVersion = this.installedTasks.get(task.name).installedVersion;
          (task as InstalledResource).clusterTask = this.installedTasks.get(task.name).clusterTask;
        } else if ((task as InstalledResource).installedVersion && (!this.installedTasks.has(task.name) || this.installedTasks.get(task.name).kind !== task.kind)){
          delete (task as InstalledResource).installedVersion;
          delete (task as InstalledResource).clusterTask;
        }
      }
    }
    this.taskList.show(this.searchTasks);
  }

  private showWelcomeList(): void {
    this.mainContainer.removeChild(this.taskList.getElement());
    this.mainContainer.appendChild(this.welcomeList.getElement());
  }

  setTknVersion(version: string): void {
    this.taskList.tknVersion = version;
  }

  setInstalledResources(tasks: InstalledResource[]): void {
    this.loader.hide();
    this.installedTasks = new Map(tasks.map(it => [it.name, it]));
    if (!this.installedList){
      const installedElement = createDiv();
      this.installedList = new ResourceList(installedElement, this.vscodeAPI, this.loader, 'installedView');
      this.welcomeList.addSubList('INSTALLED', this.installedList);
      this.installedList.tknVersion = this.taskList.tknVersion;
    }
    this.installedList.show(tasks);
    if (this.searchInput.value) {
      this.updateSearchList();
    }
  }

  setRecommendedTasks(tasks: ResourceData[]): void {
    if (!this.recommendedList){
      const recommendedElement = createDiv();
      this.recommendedList = new ResourceList(recommendedElement, this.vscodeAPI, this.loader, 'recommendedView');
      this.welcomeList.addSubList('RECOMMENDED', this.recommendedList);
      this.recommendedList.tknVersion = this.taskList.tknVersion;
    }
    this.recommendedList.show(tasks);
  }

  cancelInstall(): void {
    if (installingButton){
      installingButton.textContent = 'Install';
    }
  }

}


interface TaskViewState {
  input: string;
  welcomeList: CollapsibleListState;
}
