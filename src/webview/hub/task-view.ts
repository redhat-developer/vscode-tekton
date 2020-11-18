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
import { ListWidget } from '../common/list-widget';
import { createDiv, createSpan } from '../common/dom-util';
import * as semver from 'semver';
import { HubTaskInstallation } from '../../hub/install-common';


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

  
  constructor(private task: ResourceData, private messageSender: VSMessage, private tknVersion?: string) {
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
      this.messageSender.postMessage({type: 'openTaskPage', data: this.task});
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
    name.innerText = this.task.latestVersion.displayName ? this.task.latestVersion.displayName : this.task.name;
    header.appendChild(name);

    const version = createSpan('version');
    version.innerText = this.task.latestVersion.version;
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
    description.textContent = this.task.latestVersion.description;
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
    
    const installButton = document.createElement('a');
    installButton.classList.add('action-label', 'codicon', 'extension-action', 'install');

    installButton.textContent = 'Install';
    installButton.onclick = (e) =>{
      e.preventDefault();
      e.stopPropagation();
      this.sendInstall();
    };
    installEl.appendChild(installButton);
    actionContainer.appendChild(installEl);
    actionBar.appendChild(actionContainer);
    footer.appendChild(actionBar);
    details.appendChild(footer);
  }

  private sendInstall(): void {
    this.messageSender.postMessage({type: 'installTask', data: {
      url: this.task.latestVersion.rawURL,
      name: this.task.name,
      minPipelinesVersion: this.task.latestVersion.minPipelinesVersion,
      tknVersion: this.tknVersion
    } as HubTaskInstallation});
  }

  private addVersionCheck(container: HTMLUListElement): void {
    if (this.task.latestVersion.minPipelinesVersion) {
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

export class TaskList extends ListWidget<ResourceData> {

  tknVersion: string | undefined;

  constructor(element: HTMLElement, private messageSender: VSMessage){
    super(element);
  }

  setErrorMessage(message: string): void {
    this.element.innerText = message;
  }

  createItemWidget(item: ResourceData): Widget {
    return new TaskItem(item, this.messageSender, this.tknVersion);
  }

  show(items: ResourceData[]): void {
    if (items.length === 0) {
      this.showPlaceholder('No tasks found.');
    } else {
      super.show(items);
    }
  }

}

export class TaskView {

  private searchInput: SearchInput;
  private taskList: TaskList;

  constructor(private vscodeAPI: VSMessage & ViewState) {
    this.searchInput = new SearchInput(document.getElementById('taskInput') as HTMLInputElement, vscodeAPI);
    this.searchInput.onInputChange((input) => {
      if (input) {
        this.vscodeAPI.postMessage({type: 'search', data: input});
      } else {
        this.taskList.clear();
        this.vscodeAPI.setState({input: '', tasks: [], tknVersion: this.taskList.tknVersion});
      }
    })
    
    this.taskList = new TaskList(document.getElementById('tasksList'), this.vscodeAPI);
  }

  setErrorState(message: string): void {
    this.searchInput.disable();
    this.taskList.setErrorMessage(message);
  }

  showTasks(tasks: ResourceData[]): void {
    this.taskList.show(tasks);
    this.vscodeAPI.setState({input: this.searchInput.value, tasks: tasks, tknVersion: this.taskList.tknVersion});
  }

  restore(state: TaskViewState): void {
    this.taskList.tknVersion = state.tknVersion;
    if (state.tasks.length !== 0) {
      this.taskList.show(state.tasks);
    }
    this.searchInput.setValue(state.input);
  }

  setTknVersion(version: string): void {
    this.taskList.tknVersion = version;
  }

}


interface TaskViewState {
  input: string;
  tknVersion: string;
  tasks: ResourceData[];
}
