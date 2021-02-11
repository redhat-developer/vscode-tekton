/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import './hub.css';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const taskSvg = require('./task.svg');
import { VSMessage, ViewState} from '../common/vscode-api';
import { debounce } from 'debounce';
import {ResourceData} from '../../tekton-hub-client/api';
import { BaseWidget, Listener, Widget } from '../common/widget';
import { CollapsibleList, CollapsibleListState, ListWidget } from '../common/list-widget';
import { createDiv, createSpan } from '../common/dom-util';
import * as semver from 'semver';
import { HubTask, HubTaskInstallation, InstalledTask } from '../../hub/hub-common';
import { Loader } from '../common/loader';


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

export class TaskItem extends BaseWidget {

  
  constructor(private task: HubTask, private messageSender: VSMessage, private loader: Loader, private tknVersion?: string) {
    super();
    this.element = createDiv('task-list-item');
    const iconContainer = createDiv('icon-container');
    this.element.appendChild(iconContainer);
    const image = document.createElement('img');
    image.src = taskSvg;
    image.classList.add('icon');
    iconContainer.appendChild(image);
    this.createDetails();
    this.element.onclick = () => {
      try {
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
    version.innerText = this.task.latestVersion ? this.task.latestVersion.version : (this.task as InstalledTask).installedVersion.version;
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
    description.textContent = this.task.latestVersion ? this.task.latestVersion.description : (this.task as InstalledTask).installedVersion.description;
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

    if (this.tknVersion){
      this.addVersionCheck(actionContainer);
    }
    const installEl = document.createElement('li');
    installEl.classList.add('action-item');
    
    if (!(this.task as InstalledTask).installedVersion) {
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
      taskVersion: this.task.latestVersion
    } as HubTaskInstallation});
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

}

export class TaskList extends ListWidget<HubTask> {

  tknVersion: string | undefined;

  constructor(element: HTMLElement, private messageSender: VSMessage, private loader: Loader){
    super(element);
  }

  setErrorMessage(message: string): void {
    this.element.innerText = message;
  }

  createItemWidget(item: HubTask): Widget {
    return new TaskItem(item, this.messageSender, this.loader, this.tknVersion);
  }

  show(items: HubTask[]): void {
    if (items.length === 0) {
      this.showPlaceholder('No tasks found.');
      if (this.itemListChangedListener) {
        this.itemListChangedListener(items);
      }
    } else {
      super.show(items);
    }
  }

}

export class TaskView {

  private searchInput: SearchInput;
  private taskList: TaskList;
  private installedTasks: Map<string, InstalledTask>;
  private welcomeList: CollapsibleList<HubTask>;
  private mainContainer: HTMLElement;
  private loader: Loader;
  private installedList: TaskList | undefined;
  private recommendedList: TaskList | undefined;
  private state: TaskViewState;
  private searchTasks: ResourceData[];

  constructor(private vscodeAPI: VSMessage & ViewState) {
    this.searchInput = new SearchInput(document.getElementById('taskInput') as HTMLInputElement, vscodeAPI);
    this.searchInput.onInputChange((input) => {
      if (input) {
        this.loader.show();
        this.vscodeAPI.postMessage({type: 'search', data: input});
      } else {
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
    
    // 
    const taskListContainer = createDiv();
    taskListContainer.id = 'tasksList';
    this.taskList = new TaskList(taskListContainer, this.vscodeAPI, this.loader);

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
    this.searchInput.disable();
    this.taskList.setErrorMessage(message);
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
        if (this.installedTasks.has(task.name)){
          (task as InstalledTask).installedVersion = this.installedTasks.get(task.name).installedVersion;
          (task as InstalledTask).clusterTask = this.installedTasks.get(task.name).clusterTask;
        } else if ((task as InstalledTask).installedVersion && !this.installedTasks.has(task.name)){
          delete (task as InstalledTask).installedVersion;
          delete (task as InstalledTask).clusterTask;
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

  setInstalledTasks(tasks: InstalledTask[]): void {
    this.loader.hide();
    this.installedTasks = new Map(tasks.map(it => [it.name, it]));
    if (!this.installedList){
      const installedElement = createDiv();
      this.installedList = new TaskList(installedElement, this.vscodeAPI, this.loader);
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
      this.recommendedList = new TaskList(recommendedElement, this.vscodeAPI, this.loader);
      this.welcomeList.addSubList('RECOMMENDED', this.recommendedList);
      this.recommendedList.tknVersion = this.taskList.tknVersion;
    }
    this.recommendedList.show(tasks);
  }

}


interface TaskViewState {
  input: string;
  welcomeList: CollapsibleListState;
}
