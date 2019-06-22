import * as events from "events";
import { Uri, Event, EventEmitter, TreeItemCollapsibleState } from 'vscode';
import {getIcon} from '../icon-utils';
import {JSONStream} from 'json-stream';

enum WatchEventType {
  ADD = 'ADDED',
  UPDATE = 'MODIFIED',
  DELETE = 'DELETED'
}

enum ContainerType {
  PIPELINE,
  TASK,
  CLUSTERTASK
}

enum ObjectType {
  TASK = 'Task',
  TASKRUN = 'TaskRun',
  PIPELINE = 'Pipeline',
  PIPELINERUN = 'PipelineRun',
  CLUSTERTASK = 'ClusterTask'
}

interface TektonNode {
  readonly resource: Uri;
  readonly collapsibleState : TreeItemCollapsibleState;
  readonly label: string;
  readonly contextValue: string;
  readonly tooltip: string;
  readonly iconPath: string | Uri ;
  readonly command: string;
  readonly creationTime: string;
  getChildren(): TektonNode[];
  consumeEvent(event: any): boolean;
}


class ContainerNode implements TektonNode {

  private children: TektonNode[] = [];

  constructor(private type: ContainerType) {
  }

  get resource() {
    return Uri.parse("tekton:container");
  }
  get collapsibleState() {
    return TreeItemCollapsibleState.Expanded;
  }

get label() {
    if (this.isPipeline()) {
      return 'Pipelines';
    }
    else if (this.isTask()) {
      return 'Tasks';
    }
    else {
    return 'Cluster Tasks';
    }
  }

  get contextValue() {
    if (this.isPipeline()) {
      return 'tekton.pipelines';
    }
    else if (this.isTask()) {
      return 'tekton.tasks';
    }
    else {
      return 'tekton.clustertasks';
    }
  }

  get tooltip() {
    if (this.isPipeline()) {
      return 'Tekton Pipelines';
    }
    else if (this.isTask()) {
      return 'Tekton Tasks';
    }
    else {
    return 'Tekton Cluster Tasks';
    }
  }

  get iconPath() {
    return '';
  }
  get command() {
    return '';
  }

  get creationTime() {
    return '';
  }

  private isPipeline(): boolean {
    return this.type === ContainerType.PIPELINE;
  }

  private isTask(): boolean {
    return this.type === ContainerType.TASK;
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
    if (this.isPipeline() && (objectType === ObjectType.CLUSTERTASK)) {
      return false;
    }
    if (this.isTask() && (objectType === ObjectType.CLUSTERTASK)) {
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
        if(objectType === ObjectType.CLUSTERTASK){
          this.addNewClusterTask(event.object);
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
        if(objectType === ObjectType.CLUSTERTASK){
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
    const task = new TaskNode(Uri.parse(`tekton:task`), object.metadata.name, `[${object.metadata.namespace}]-${object.metadata.name}`, object.metadata.creationTimestamp);
    this.children.push(task);
    this.children.sort((a,b) => {
      if (a.label < b.label) { return -1; }
      if (a.label > b.label) { return 1; }
      return 0;
    });
  }
  addNewPipeline(object: any): void {
    const pipe = new PipelineNode(Uri.parse(`tekton:pipeline`), object.metadata.name, `[${object.metadata.namespace}]-${object.metadata.name}`, object.spec.tasks);
    this.children.push(pipe);
    this.children.sort((a,b) => {
      if (a.label < b.label) { return -1; }
      if (a.label > b.label) { return 1; }
      return 0;
    });
  }
  addNewClusterTask(object: any): void {
    const clustertask = new ClusterTaskNode(Uri.parse(`tekton:clustertask`), object.metadata.name, `[${object.metadata.namespace}]-${object.metadata.name}`);
    this.children.push(clustertask);
    this.children.sort((a,b) => {
      if (a.label < b.label) { return -1; }
      if (a.label > b.label) { return 1; }
      return 0;
    });
}

}

class PipelineRunNode implements TektonNode{
  private children: TektonNode[] = [];
  constructor(public resource: Uri, public label: string, public tooltip: string, public state: string, public creationTime: string) {
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
      if (event.object.kind === ObjectType.TASKRUN) {
        if (!event.object.metadata.ownerReferences) {
          return false;
        }
        if( event.object.metadata.ownerReferences[0].name === this.label){
          const taskrun = new TaskRunNode(Uri.parse('tekton:/pipeline/pipelinerun/taksrun'),event.object.metadata.name,
          `[${event.object.metadata.namespace}]-${event.object.metadata.name}`, event.object.status.conditions[0].status, event.object.metadata.creationTimestamp );
          this.children.push(taskrun);
          this.children.sort((a,b) => {
            if(a.creationTime < b.creationTime){ return -1; }
            if(a.creationTime > b.creationTime){ return 1; }
            return 0;
          });
          return true;
        }
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

  constructor(public resource: Uri, public label: string, public tooltip: string, public state: string, public creationTime: string) {
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

  constructor(public resource: Uri, public label: string, public tooltip: string, public pipelineTasks: string[]) { }

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

  get creationTime() {
    return '';
  }

  getChildren(): TektonNode[] {
    return this.children;
  }

  getPipelineTasks(): string[] {
    return this.pipelineTasks;
  }

  parseToolTip(): string {
    return this.tooltip.substring(this.tooltip.indexOf("-") +1);
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    switch (type) {
      case WatchEventType.ADD:
        if (event.object.kind === ObjectType.PIPELINERUN){
          if(event.object.spec.pipelineRef.name === this.parseToolTip()) {
            const status = event.object.status ? event.object.status.conditions[0].status : '';
            const node = new PipelineRunNode(Uri.parse('tekton:pipeline/pipelinerun'), event.object.metadata.name,
            `[${event.object.metadata.namespace}]-${event.object.metadata.name}`, status, event.object.metadata.creationTimestamp);
            this.children.push(node);
            this.children.sort((a,b) => {
              if(a.creationTime < b.creationTime) { return -1; }
              if(a.creationTime > b.creationTime) { return 1; }
              return 0;
            });
            return true;
          }
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

  constructor(public resource: Uri, public label: string, public tooltip: string, public creationTime: string) { }

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

class ClusterTaskNode implements TektonNode {

  constructor(public resource: Uri, public label: string, public tooltip: string) { }

  get iconPath() {
    return getIcon('clustertask.png');
  }

  get command() {
    return '';
  }

  get contextValue() {
    return 'tekton.clustertask';
  }

  get collapsibleState() {
    return TreeItemCollapsibleState.None;
  }

  get creationTime() {
    return '';
  }

  getChildren(): TektonNode[] {
    return [];
  }

  consumeEvent(event: any): boolean {
    const type: WatchEventType = event.type;
    switch (type) {
      case WatchEventType.UPDATE:
        if (event.object.kind === ObjectType.CLUSTERTASK && event.object.metadata.name === this.label)  {
          this.resource = Uri.parse(`tekton:clustertask`);
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

  private children: TektonNode[] = [new ContainerNode(ContainerType.PIPELINE), new ContainerNode(ContainerType.TASK), new ContainerNode(ContainerType.CLUSTERTASK)];

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
    let clientConfig = null;
    try {
      const kubeConfig = config.loadKubeconfig();
      if(kubeConfig){
        clientConfig = config.fromKubeconfig(kubeConfig);
      }
    } catch (error) {
        // ignore errors to allow loading inCluster
    }
    if(!clientConfig){
      clientConfig = config.getInCluster();
    }

    const client = new Client({ config: clientConfig });
    await client.loadSpec();
    await this.loadCrds(client);
    await this.wireStreams(client);
  }

  private async wireStreams(client: k8s.ApiRoot) {
    const watchList = [
        client.apis['tekton.dev'].v1alpha1.watch.pipelines,
        client.apis['tekton.dev'].v1alpha1.watch.pipelineruns,
        client.apis['tekton.dev'].v1alpha1.watch.pipelineresources,
        client.apis['tekton.dev'].v1alpha1.watch.clustertasks,
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
    const crds = ['tasks.tekton.dev', 'taskruns.tekton.dev', 'pipelines.tekton.dev', 'pipelineresources.tekton.dev', 'clustertasks.tekton.dev', 'pipelineruns.tekton.dev'];
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

