import * as events from "events";
import * as k8s from 'kubernetes-client';
import { Uri, Event, EventEmitter, TreeItemCollapsibleState } from 'vscode';
import {getIcon} from '../icon-utils';
import *  as JSONStream from 'json-stream';

const Client = k8s.Client1_10;
const config = k8s.config;

enum WatchEventType {
  ADD = 'ADDED',
  UPDATE = 'MODIFIED',
  DELETE = 'DELETED'
}

enum ConatinerType {
  PIPELINE,
  TASK
}

enum ObjectType {
  TASK = 'Task',
  TASKRUN = 'TaskRun',
  PIPELINE = 'Pipeline',
  PIPELINERUN = 'PipelineRun'
}

interface TektonNode {
  readonly resource: Uri;
  readonly collapsibleState : TreeItemCollapsibleState;
  readonly label: string;
  readonly contextValue: string;
  readonly tooltip: string;
  readonly iconPath: string | Uri ;
  readonly command: string;
  getChildren(): TektonNode[];
  consumeEvent(event: any): boolean;
}


class ContainerNode implements TektonNode {

  private children: TektonNode[] = [];

  constructor(private type: ConatinerType) {
  }

  get resource() {
    return Uri.parse("tekton:container");
  }
  get collapsibleState() {
    return TreeItemCollapsibleState.Expanded;
  }

  get label() {
    return this.isPipeline() ? 'Pipelines' : 'Tasks';
  }

  get contextValue() {
    return this.isPipeline() ? 'tekton.pipelines' : 'tekton.tasks';
  }

  get tooltip() {
    return this.isPipeline() ? 'Tekton Pipelines' : 'Tekton Tasks';
  }

  get iconPath() {
    return '';
  }
  get command() {
    return '';
  }

  private isPipeline(): boolean {
    return this.type === ConatinerType.PIPELINE;
  }

  getChildren(): TektonNode[] {
    return this.children;
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    const objectType = event.object.kind;
    if (this.isPipeline() && (objectType === ObjectType.TASK)) {
      return false;
    }
    switch (type) {
      case WatchEventType.ADD:
        if (objectType === ObjectType.TASK) {
          this.addNewTask(event.object);
          return true;
        }
        if(objectType === ObjectType.PIPELINE){
          this.addNewPipeline(event.object);
          return true;
        }
        break;
      case WatchEventType.DELETE:
        if(objectType === ObjectType.TASK){
          this.children = this.children.filter((elem) => {return event.object.metadata.name !== elem.label; });
          return true;
        }
        if(objectType === ObjectType.PIPELINE){
          this.children = this.children.filter((elem) => {return event.object.metadata.name !== elem.label; });
          return true;
        }
        break;
      default:
        break;
    }
    for (const node of this.children) {
      if (node.consumeEvent(event)) {
        return true;
      }
    }
    return false;
  }

  addNewTask(object: any): void {
    const task = new TaskNode(Uri.parse(`tekton:task`), object.metadata.name, `[${object.metadata.namespace}]-${object.metadata.name}`);
    this.children.push(task);
  }
  addNewPipeline(object: any): void {
    const pipe = new PipelineNode(Uri.parse(`tekton:pipeline`), object.metadata.name, `[${object.metadata.namespace}]-${object.metadata.name}`);
    this.children.push(pipe);
  }

}

class PipelineRunNode implements TektonNode{
  private children: TektonNode[] = [];
  constructor(public resource: Uri, public label: string, public tooltip: string, public state: string) {
  }

  get iconPath() {
    let iconfile = 'running.png';
    if(this.state === 'True'){
      iconfile = 'success.png';
    }
    if(this.state=== 'False'){
      iconfile = 'failed.png';
    }
    return getIcon(iconfile);
  }

  get command() {
    return '';
  }

  get contextValue() {
    return 'tekton.pipelinerun';
  }

  get collapsibleState() {
    return TreeItemCollapsibleState.Collapsed;
  }

  getChildren(): TektonNode[] {
    return this.children;
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    switch (type) {
      case WatchEventType.UPDATE:
      if( event.object.kind === ObjectType.PIPELINERUN &&  event.object.metadata.name === this.label){
        this.label =  event.object.metadata.name;
        this.tooltip = `[${event.object.metadata.namespace}]-${event.object.metadata.name}`;
        this.state = event.object.status ? event.object.status.conditions[0].status: '';
        return true;
      }
      break;
      case WatchEventType.ADD:
      if (event.object.kind === ObjectType.TASKRUN && event.object.metadata.ownerReferences[0].name === this.label){
        const taskrun = new TaskRunNode(Uri.parse('tekton:/pipeline/pipelinerun/taksrun'),event.object.metadata.name,
        `[${event.object.metadata.namespace}]-${event.object.metadata.name}`,event.object.status.conditions[0].status );
        this.children.push(taskrun);
        return true;
      }
      break;
      case WatchEventType.DELETE:
      if (event.object.kind === ObjectType.TASKRUN) {
        this.children = this.children.filter((elem) => { return event.object.metadata.name !== elem.label; });
        return true;
      }
      break;
    }
    return false;

  }


}
class TaskRunNode implements TektonNode {

  constructor(public resource: Uri, public label: string, public tooltip: string, public state: string) {
  }

  get iconPath() {
    let iconfile = 'running.png';
    if(this.state === 'True'){
      iconfile = 'success.png';
    }
    if(this.state=== 'False'){
      iconfile = 'failed.png';
    }
    return getIcon(iconfile);
  }

  get command() {
    return '';
  }

  get contextValue() {
    return 'tekton.taskrun';
  }

  get collapsibleState() {
    return TreeItemCollapsibleState.None;
  }

  getChildren(): TektonNode[] {
    return [];
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    if(type !== WatchEventType.UPDATE || event.object.kind !== ObjectType.TASKRUN ||  event.object.metadata.name !== this.label){
      return false;
    }
    this.label =  event.object.metadata.name;
    this.tooltip = `[${event.object.metadata.namespace}]-${event.object.metadata.name}`;
    this.state = event.object.status.conditions[0].status;
    return true;

  }

}

class PipelineNode implements TektonNode{
  private children: TektonNode[] = [];

  constructor(public resource: Uri, public label: string, public tooltip: string) { }

  get iconPath() {
    return getIcon('pipe.png');
  }

  get command() {
    return '';
  }

  get contextValue() {
    return 'tekton.pipeline';
  }

  get collapsibleState() {
    return this.children.length > 0? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
  }

  getChildren(): TektonNode[] {
    return this.children;
  }
  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    switch (type) {
      case WatchEventType.ADD:
        if (event.object.kind === ObjectType.PIPELINERUN) {
          const status = event.object.status ? event.object.status.conditions[0].status : '';
          const node = new PipelineRunNode(Uri.parse('tekton:pipeline/pipelinerun'), event.object.metadata.name,
            `[${event.object.metadata.namespace}]-${event.object.metadata.name}`,status);
          this.children.push(node);
          return true;
        }
        break;
      case WatchEventType.DELETE:
        if (event.object.kind === ObjectType.PIPELINERUN) {
          this.children = this.children.filter((elem) => { return event.object.metadata.name !== elem.label; });
          return true;
        }
        break;
      case WatchEventType.UPDATE:
        if (event.object.kind === ObjectType.PIPELINE) {
          this.resource = Uri.parse(`tekton:pipeline`);
          this.label = event.object.metadata.name;
          this.tooltip = `[${event.object.metadata.namespace}]-${event.object.metadata.name}`;
          return true;
        }
        break;
      default:
        break;
    }
    for (const node of this.children) {
      if (node.consumeEvent(event)) {
        return true;
      }
    }
    return false;

  }
}

class TaskNode implements TektonNode {

  constructor(public resource: Uri, public label: string, public tooltip: string) { }

  get iconPath() {
    return getIcon('task.png');
  }

  get command() {
    return '';
  }

  get contextValue() {
    return 'tekton.task';
  }

  get collapsibleState() {
    return TreeItemCollapsibleState.None;
  }

  getChildren(): TektonNode[] {
    return [];
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    switch (type) {
      case WatchEventType.UPDATE:
        if (event.object.kind === ObjectType.TASK && event.object.metadata.name === this.label)  {
          this.resource = Uri.parse(`tekton:task`);
          this.label = event.object.metadata.name;
          this.tooltip = `[${event.object.metadata.namespace}]-${event.object.metadata.name}`;
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  }
}


class PipelineModel {

  private children: TektonNode[] = [new ContainerNode(ConatinerType.PIPELINE), new ContainerNode(ConatinerType.TASK)];

  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();

  readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

  getChildren(element: TektonNode): TektonNode[] {
    return element ? element.getChildren() : this.children;
  }

  private watcher = new PipelineResourcesWatcher();
  connect() {
    this.watcher.on('tekton_event', (event) => {
      try {
        for (const node of this.children) {
          if (node.consumeEvent(event)) {
            break;
          }
        }
      } catch (error) {
        console.log(error);
      }
      this._onDidChangeTreeData.fire();
    });
    this.watcher.startListening();
  }
}


class PipelineResourcesWatcher extends events.EventEmitter {

  async startListening() {
    const client = new Client({ config: config.fromKubeconfig() });
    await client.loadSpec();
    await this.loadCrds(client);
    await this.wireStreams(client);
  }

  private async wireStreams(client: k8s.ApiRoot) {
    const watchList = [
        client.apis['tekton.dev'].v1alpha1.watch.pipelines,
        client.apis['tekton.dev'].v1alpha1.watch.pipelineruns,
        client.apis['tekton.dev'].v1alpha1.watch.taskruns,
        client.apis['tekton.dev'].v1alpha1.watch.tasks
    ];
    for (const resource of watchList) {

      const stream = await resource.getStream();
      const jsonStream = new JSONStream();
      stream.pipe(jsonStream);
      jsonStream.on('data', (event: any) => {
        console.log('Received event :' + JSON.stringify(event));
        this.emit('tekton_event', event);
      });
    }
  }
  private async loadCrds(client: k8s.ApiRoot) {
    const crds = ['tasks.tekton.dev', 'taskruns.tekton.dev', 'pipelines.tekton.dev', 'pipelineruns.tekton.dev'];
    for (const crdName of crds) {
      const crd = await client.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions(crdName).get();
      client.addCustomResourceDefinition(crd.body);
    }
  }
}

export {
  PipelineModel,
  TektonNode
};
