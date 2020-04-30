/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TknElement, TknElementType, TknArray, TknBaseRootElement, NodeTknElement, TknStringElement, TknValueElement, TknParam } from '../common';
import { YamlMap, YamlSequence, YamlNode, isSequence } from '../../yaml-support/yaml-locator';
import { pipelineYaml, getYamlMappingValue, findNodeByKey } from '../../yaml-support/tkn-yaml';

const ephemeralMap: YamlMap = {
  endPosition: -1,
  startPosition: -1,
  kind: 'EphemeralNode',
  raw: 'EphemeralNode',
  mappings: []
};

export class Pipeline extends TknBaseRootElement {


  type = TknElementType.PIPELINE;

  private _spec: PipelineSpec;
  constructor(parent: TknElement, yamlNode: YamlMap) {
    super(parent, yamlNode);
  }


  get spec(): PipelineSpec {
    if (!this._spec) {
      this._spec = new PipelineSpec(this, pipelineYaml.getPipelineSpec(this.node as YamlMap));
    }
    return this._spec;
  }

  collectChildren(): TknElement[] {
    return [this.kind, this.apiVersion, this.metadata, this.spec];
  }


}

export class PipelineSpec extends NodeTknElement {

  type = TknElementType.PIPELINE_SPEC;

  private _resources: TknArray<PipelineDeclaredResource>;
  private _tasks: TknArray<PipelineTask>;
  private _description: TknStringElement;
  private _params: TknArray<ParamSpec>;
  private _workspaces: TknArray<WorkspacePipelineDeclaration>;

  constructor(parent: Pipeline, node: YamlMap) {
    super(parent, node);
  }

  get description(): TknStringElement | undefined {
    const desc = getYamlMappingValue(this.node as YamlMap, 'description');
    if (desc && !this._description) {
      this._description = new TknStringElement(this, findNodeByKey('description', this.node as YamlMap));
    }
    return this._description;
  }

  get resources(): TknArray<PipelineDeclaredResource> | undefined {
    if (!this._resources) {
      const resNode = findNodeByKey<YamlSequence>('resources', this.node as YamlMap);
      if (resNode) {
        this._resources = new TknArray(TknElementType.PIPELINE_RESOURCES, PipelineDeclaredResource, this, resNode);
      }
    }
    return this._resources;
  }

  get tasks(): TknArray<PipelineTask> {
    if (!this._tasks) {
      this._tasks = new TknArray(TknElementType.PIPELINE_TASKS, PipelineTask, this, pipelineYaml.getTasks(this.node as YamlMap));
    }
    return this._tasks;
  }

  get params(): TknArray<ParamSpec> {
    if (!this._params) {
      const paramsNode = findNodeByKey<YamlSequence>('params', this.node as YamlMap)
      if (paramsNode) {
        this._params = new TknArray(TknElementType.PARAM_SPECS, ParamSpec, this, paramsNode);
      }
    }
    return this._params;
  }

  get workspaces(): TknArray<WorkspacePipelineDeclaration> {
    if (!this._workspaces) {
      const workspacesNode = findNodeByKey<YamlSequence>('workspaces', this.node as YamlMap)
      if (workspacesNode) {
        this._workspaces = new TknArray(TknElementType.PIPELINE_WORKSPACES, WorkspacePipelineDeclaration, this, workspacesNode);
      }
    }
    return this._workspaces;
  }

  collectChildren(): TknElement[] {
    return [this.tasks, this.description, this.resources, this.params, this.workspaces];
  }
}

export class PipelineDeclaredResource extends NodeTknElement {

  type = TknElementType.PIPELINE_RESOURCE;

  private _name: TknStringElement;
  private _resourceType: TknStringElement;
  private _optional: TknValueElement<boolean>;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get resourceType(): TknStringElement {
    if (!this._resourceType) {
      this._resourceType = new TknStringElement(this, findNodeByKey('type', this.node as YamlMap))
    }
    return this._resourceType;
  }


  get optional(): TknValueElement<boolean> | undefined {
    if (!this._optional) {
      const optional = findNodeByKey<YamlNode>('optional', this.node as YamlMap)
      if (optional) {
        this._optional = new TknValueElement(optional.raw === 'true', this, optional);
      }
    }

    return this._optional;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.resourceType, this.optional];
  }
}

export class PipelineTask extends NodeTknElement {

  type = TknElementType.PIPELINE_TASK;

  private _name: TknStringElement;
  private _taskRef: PipelineTaskRef;
  private _conditions: TknArray<PipelineTaskCondition>;
  private _retries: TknValueElement<number>;
  private _runAfter: TknArray<TknStringElement>;
  private _resources: PipelineTaskResources;
  private _params: TknArray<TknParam>;
  private _workspaces: TknArray<WorkspacePipelineTaskBinding>;
  private _timeout: TknStringElement;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get taskRef(): PipelineTaskRef {
    if (!this._taskRef) {
      this._taskRef = new PipelineTaskRef(this, pipelineYaml.getTaskRef(this.node as YamlMap));
    }
    return this._taskRef;
  }

  get conditions(): TknArray<PipelineTaskCondition> {
    if (!this._conditions) {
      const conditionsNode = findNodeByKey<YamlSequence>('conditions', this.node as YamlMap)
      if (conditionsNode) {
        this._conditions = new TknArray(TknElementType.PIPELINE_TASK_CONDITIONS, PipelineTaskCondition, this, conditionsNode);
      }
    }

    return this._conditions;
  }

  get retries(): TknValueElement<number> | undefined {
    if (!this._retries) {
      const retriesNode = findNodeByKey<YamlNode>('retries', this.node as YamlMap)
      if (retriesNode) {
        this._retries = new TknValueElement(Number.parseInt(retriesNode.raw), this, retriesNode);
      }
    }

    return this._retries;
  }

  get runAfter(): TknArray<TknStringElement> | undefined {
    if (!this._runAfter) {
      const runAfterNode = findNodeByKey<YamlSequence>('runAfter', this.node as YamlMap)
      if (runAfterNode) {
        this._runAfter = new TknArray(TknElementType.PIPELINE_TASK_RUN_AFTER, TknStringElement, this, runAfterNode);
      }
    }

    return this._runAfter;
  }

  get resources(): PipelineTaskResources | undefined {
    if (!this._resources) {
      const resourcesNode = findNodeByKey<YamlNode>('resources', this.node as YamlMap)
      if (resourcesNode) {
        this._resources = new PipelineTaskResources(this, resourcesNode);
      }
    }

    return this._resources;
  }

  get params(): TknArray<TknParam> {
    if (!this._params) {
      const runAfterNode = findNodeByKey<YamlSequence>('params', this.node as YamlMap)
      if (runAfterNode) {
        this._params = new TknArray(TknElementType.PIPELINE_TASK_PARAMS, TknParam, this, runAfterNode);
      }
    }

    return this._params;
  }

  get workspaces(): TknArray<WorkspacePipelineTaskBinding> {
    if (!this._workspaces) {
      const workspacesNode = findNodeByKey<YamlSequence>('workspaces', this.node as YamlMap)
      if (workspacesNode) {
        this._workspaces = new TknArray(TknElementType.PIPELINE_TASK_WORKSPACES, WorkspacePipelineTaskBinding, this, workspacesNode);
      }
    }

    return this._workspaces;
  }

  get timeout(): TknStringElement | undefined {
    if (!this._timeout) {
      const retriesNode = findNodeByKey<YamlNode>('timeout', this.node as YamlMap)
      if (retriesNode) {
        this._timeout = new TknStringElement(this, retriesNode);
      }
    }

    return this._timeout;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.taskRef, this.conditions, this.retries, this.runAfter, this.resources, this.params, this.workspaces, this.timeout];
  }
}

export enum PipelineTaskKind {
  Task = 'Task',
  ClusterTask = 'ClusterTask'
}

export class PipelineTaskRef extends NodeTknElement {

  type = TknElementType.PIPELINE_TASK_REF;

  private _name: TknStringElement;
  private _kind: TknValueElement<PipelineTaskKind>;

  constructor(parent: PipelineTask, node: YamlMap) {
    super(parent, node);
  }

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get kind(): TknValueElement<PipelineTaskKind> {
    if (!this._kind) {
      const kindVal = getYamlMappingValue(this.node as YamlMap, 'kind');
      this._kind = new TknValueElement(this.getKind(), this, (kindVal ? findNodeByKey('kind', this.node as YamlMap) : ephemeralMap));
    }
    return this._kind;
  }

  private getKind(): PipelineTaskKind {
    const kind = getYamlMappingValue(this.node as YamlMap, 'kind');
    if (!kind) {
      return PipelineTaskKind.Task;
    }

    return PipelineTaskKind[kind];
  }

  collectChildren(): TknElement[] {
    return [this.name, this.kind];
  }

}

export class ParamSpec extends NodeTknElement {
  type = TknElementType.PARAM_SPEC;
  private _name: TknStringElement;
  private _paramType: TknStringElement;
  private _description: TknStringElement;
  private _default: TknStringElement | TknArray<TknStringElement> | undefined;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get paramType(): TknStringElement | undefined {
    if (!this._paramType) {
      const paramMap = findNodeByKey<YamlNode>('type', this.node as YamlMap);
      if (paramMap) {
        this._paramType = new TknStringElement(this, paramMap);
      }
    }

    return this._paramType;
  }

  get description(): TknStringElement | undefined {
    if (!this._description) {
      const paramMap = findNodeByKey<YamlNode>('description', this.node as YamlMap);
      if (paramMap) {
        this._description = new TknStringElement(this, paramMap);
      }
    }

    return this._description;
  }

  get default(): TknStringElement | TknArray<TknStringElement> | undefined {
    if (!this._default) {
      const defaultNode = findNodeByKey<YamlNode>('default', this.node as YamlMap);
      if (defaultNode) {
        if (isSequence(defaultNode)) {
          this._default = new TknArray(TknElementType.STRING_ARRAY, TknStringElement, this, defaultNode);
        } else {
          this._default = new TknStringElement(this, defaultNode);

        }
      }
    }

    return this._default;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.paramType, this.description, this.default];
  }

}

export class WorkspacePipelineDeclaration extends NodeTknElement {

  type = TknElementType.PIPELINE_WORKSPACE;
  private _name: TknStringElement;
  private _description: TknStringElement;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get description(): TknStringElement | undefined {
    if (!this._description) {
      const paramMap = findNodeByKey<YamlNode>('description', this.node as YamlMap);
      if (paramMap) {
        this._description = new TknStringElement(this, paramMap);
      }
    }

    return this._description;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.description]
  }
}

export class PipelineTaskInputResource extends NodeTknElement {
  type = TknElementType.PIPELINE_TASK_INPUT_RESOURCE;
  private _name: TknStringElement;
  private _resource: TknStringElement;
  private _from: TknArray<TknStringElement>;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get resource(): TknStringElement | undefined {
    if (!this._resource) {
      const resourceMap = findNodeByKey<YamlNode>('resource', this.node as YamlMap);
      if (resourceMap) {
        this._resource = new TknStringElement(this, resourceMap);
      }
    }

    return this._resource;
  }

  get from(): TknArray<TknStringElement> {
    if (!this._from) {
      const fromMap = findNodeByKey<YamlSequence>('from', this.node as YamlMap);
      if (fromMap) {
        this._from = new TknArray(TknElementType.PIPELINE_TASK_INPUT_RESOURCE_FROM, TknStringElement, this, fromMap);
      }
    }
    return this._from;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.resource, this.from];
  }


}

export class PipelineTaskCondition extends NodeTknElement {
  type = TknElementType.PIPELINE_TASK_CONDITION;
  private _conditionRef: TknStringElement;
  private _resources: TknArray<PipelineTaskInputResource>;
  private _params: TknArray<TknParam>;

  get conditionRef(): TknStringElement {
    if (!this._conditionRef) {
      this._conditionRef = new TknStringElement(this, findNodeByKey('conditionRef', this.node as YamlMap))
    }
    return this._conditionRef;
  }

  get params(): TknArray<TknParam> {
    if (!this._params) {
      const resourcesMap = findNodeByKey<YamlSequence>('params', this.node as YamlMap);
      if (resourcesMap) {
        this._params = new TknArray(TknElementType.PARAMS, TknParam, this, resourcesMap);
      }
    }
    return this._params;
  }

  get resources(): TknArray<PipelineTaskInputResource> {
    if (!this._resources) {
      const resourcesMap = findNodeByKey<YamlSequence>('resources', this.node as YamlMap);
      if (resourcesMap) {
        this._resources = new TknArray(TknElementType.PIPELINE_TASK_INPUT_RESOURCES, PipelineTaskInputResource, this, resourcesMap);
      }
    }
    return this._resources;
  }

  collectChildren(): TknElement[] {
    return [this.conditionRef, this.params, this.resources]
  }

}

export class PipelineTaskOutputResource extends NodeTknElement {
  type = TknElementType.PIPELINE_TASK_OUTPUTS_RESOURCE;

  private _name: TknStringElement;
  private _resource: TknStringElement;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get resource(): TknStringElement | undefined {
    if (!this._resource) {
      const resourceMap = findNodeByKey<YamlNode>('resource', this.node as YamlMap);
      if (resourceMap) {
        this._resource = new TknStringElement(this, resourceMap);
      }
    }

    return this._resource;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.resource];
  }

}

export class PipelineTaskResources extends NodeTknElement {
  type = TknElementType.PIPELINE_TASK_RESOURCES;
  private _inputs: TknArray<PipelineTaskInputResource>;
  private _outputs: TknArray<PipelineTaskOutputResource>;

  get inputs(): TknArray<PipelineTaskInputResource> {
    if (!this._inputs) {
      const inputsMap = findNodeByKey<YamlSequence>('inputs', this.node as YamlMap);
      if (inputsMap) {
        this._inputs = new TknArray(TknElementType.PIPELINE_TASK_INPUT_RESOURCES, PipelineTaskInputResource, this, inputsMap);
      }
    }
    return this._inputs;
  }

  get outputs(): TknArray<PipelineTaskOutputResource> {
    if (!this._outputs) {
      const inputsMap = findNodeByKey<YamlSequence>('outputs', this.node as YamlMap);
      if (inputsMap) {
        this._outputs = new TknArray(TknElementType.PIPELINE_TASK_OUTPUTS_RESOURCES, PipelineTaskOutputResource, this, inputsMap);
      }
    }
    return this._outputs;
  }

  collectChildren(): TknElement[] {
    return [this.inputs, this.outputs];
  }

}

export class WorkspacePipelineTaskBinding extends NodeTknElement {
  type = TknElementType.PIPELINE_TASK_WORKSPACE;

  private _name: TknStringElement;
  private _workspace: TknStringElement;

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, findNodeByKey('name', this.node as YamlMap))
    }
    return this._name;
  }

  get workspace(): TknStringElement | undefined {
    if (!this._workspace) {
      const resourceMap = findNodeByKey<YamlNode>('workspace', this.node as YamlMap);
      if (resourceMap) {
        this._workspace = new TknStringElement(this, resourceMap);
      }
    }

    return this._workspace;
  }

  collectChildren(): TknElement[] {
    return [this.name, this.workspace];
  }
}


