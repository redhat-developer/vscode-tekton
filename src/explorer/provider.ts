import { TreeDataProvider, Event, TreeItem, ProviderResult, TreeItemCollapsibleState } from "vscode";
import { PipelineModel, TektonNode } from "./model";


class PipelineTreeDataProvider implements TreeDataProvider<TektonNode> {

  constructor(private model: PipelineModel){
    this.model.connect();
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
    return element?
    element.getChildren() :
    this.model.getChildren(element);

  }
}

export{
  PipelineTreeDataProvider
};
