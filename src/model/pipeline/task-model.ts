/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { findNodeByKey } from '../../yaml-support/tkn-yaml';
import { YamlMap, YamlSequence } from '../../yaml-support/yaml-locator';
import { NodeTknElement, TknArray, TknElement, TknStringElement } from '../common';
import { TknElementType } from '../element-type';

export class EmbeddedTask extends NodeTknElement {

  type = TknElementType.EMBEDDED_TASK;

  // TODO: implement this:
  // private _metadata: PipelineTaskMetadata;
  // private _resources: TknArray<TaskResource>;
  // private _params: TknArray<ParamSpec>;
  // private _description: TknStringElement;
  // private _steps: TknArray<Step>;
  // private _volumes: TknArray<Volume>;
  // private _stepTemplate: Container;
  // private _sidecars: TknArray<Sidecar>;
  // private _workspaces: TknArray<WorkspaceDeclaration>;
  private _results: TknArray<TaskResult>;

  get results(): TknArray<TaskResult> {
    if (!this._results) {
      const resultsNode = findNodeByKey<YamlSequence>('results', this.node as YamlMap)
      if (resultsNode) {
        this._results = new TknArray(TknElementType.TASK_RESULTS, TaskResult, this, resultsNode);
      }
    }

    return this._results;
  }

  collectChildren(): TknElement[] {
    return [this.results];
  }
  
}

export class TaskResult extends NodeTknElement {

  type = TknElementType.TASK_RESULT;

  private _name: TknStringElement;
  private _description: TknStringElement;

  get name(): TknStringElement {
    if (!this._name){
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get description(): TknStringElement {
    if (!this._description){
      this._description = new TknStringElement(this, findNodeByKey('description', this.node as YamlMap))
    }
    return this._description;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.description];
  }


}
