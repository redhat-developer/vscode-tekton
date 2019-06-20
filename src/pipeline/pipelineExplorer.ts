import { TreeDataProvider, Event, EventEmitter, TreeItem, ProviderResult, Disposable } from "vscode";
import { PipelineModel, TektonNode } from "../explorer/model";
import { Tkn, TektonObject, TknImpl } from './tkn';


export class PipelineExplorer implements TreeDataProvider<TektonNode>, Disposable {
  private static instance: PipelineExplorer;
  private static tkn: Tkn = TknImpl.Instance;
  private onDidChangeTreeDataEmitter: EventEmitter<TektonNode | undefined> = new EventEmitter<TektonNode | undefined>();
  
  constructor(private model: PipelineModel) {
    this.model.onDidChangeTreeData((e) => {this.refresh(e);});
    this.model.connect();
  }
  static getInstance(): PipelineExplorer {
    if (!PipelineExplorer.instance) {
      PipelineExplorer.instance = PipelineExplorer.instance;
    }
    return PipelineExplorer.instance;
  }

  get onDidChangeTreeData(): Event<any> {
    return this.model.onDidChangeTreeData;
  }
  getTreeItem(element: TektonNode): TreeItem | Thenable<TreeItem> {
    let item: TreeItem = {
      label: element.label,
      resourceUri: element.resource,
      contextValue: element.contextValue,
      tooltip: element.tooltip,
      collapsibleState: element.collapsibleState
    };
    item.iconPath = element.iconPath;
    return item;
  }
  getChildren(element: TektonNode): ProviderResult<TektonNode[]> {
    return element ?
      element.getChildren() :
      this.model.getChildren(element);
  }
  dispose() {
    throw new Error("Method not implemented.");
  }
  
  refresh(target?: TektonNode): any {
    if (!target) {
      PipelineExplorer.tkn.clearCache();
    }
    this.onDidChangeTreeDataEmitter.fire(target);
  }
}
