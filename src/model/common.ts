/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { YamlNode, YamlMap, YamlSequence, isSequence, YamlScalar } from '../yaml-support/yaml-locator';
import { tektonYaml, findNodeByKey } from '../yaml-support/tkn-yaml';
import * as _ from 'lodash';

export enum TknElementType {
  DOCUMENT,
  PIPELINE,
  METADATA,
  PARAM,
  PARAMS,
  PIPELINE_SPEC,
  PIPELINE_RESOURCES,
  PIPELINE_RESOURCE,
  PIPELINE_TASKS,
  PIPELINE_TASK,
  PIPELINE_TASK_REF,
  VALUE,
  PARAM_SPECS,
  PARAM_SPEC,
  STRING_ARRAY,
  PIPELINE_WORKSPACES,
  PIPELINE_WORKSPACE,
  PIPELINE_TASK_CONDITIONS,
  PIPELINE_TASK_CONDITION,
  PIPELINE_TASK_INPUT_RESOURCES,
  PIPELINE_TASK_INPUT_RESOURCE,
  PIPELINE_TASK_INPUT_RESOURCE_FROM,
  PIPELINE_TASK_RUN_AFTER,
  PIPELINE_TASK_RESOURCES,
  PIPELINE_TASK_OUTPUTS_RESOURCE,
  PIPELINE_TASK_OUTPUTS_RESOURCES,
  PIPELINE_TASK_PARAMS,
  PIPELINE_TASK_WORKSPACE,
  PIPELINE_TASK_WORKSPACES,
  PIPELINE_TASK_WHEN,
  PIPELINE_TASK_WHEN_VALUES,
  EMBEDDED_TASK,
  PIPELINE_TASK_METADATA,
  TASK_RESULT,
  TASK_RESULTS,
}

export function insideElement(element: TknElement, pos: number): boolean {
  return element.startPosition <= pos && element.endPosition > pos;
}
function isSimpleElement(element: TknElement): boolean {
  return element.type === TknElementType.VALUE;
}

function internalFindElement(pos: number, elements: TknElement[]): TknElement | undefined {
  for (const el of elements) {
    if (!el || !insideElement(el, pos)) {
      continue;
    }

    if (el && isSimpleElement(el)) {
      return el;
    }
    let result;
    if (el instanceof NodeTknElement) {
      result = internalFindElement(pos, el.collectChildren());
    }

    if (!result) {
      result = el;
    }

    return result;
  }
}

export abstract class TknElement {

  abstract type: TknElementType;

  constructor(readonly parent: TknElement | undefined,
    protected readonly node: YamlNode) {
  }

  get startPosition(): number {
    if (!this.node) {
      console.error(this);
    }
    return this.node.startPosition;
  }

  get endPosition(): number {
    return this.node.endPosition;
  }

  abstract findElement(pos: number): TknElement | undefined;

}

export abstract class LeafTknElement extends TknElement {
  constructor(parent: TknElement, node: YamlNode) {
    super(parent, node);
  }

  findElement(pos: number): TknElement | undefined {
    if (insideElement(this, pos)) {
      return this;
    }
    return undefined;
  }

}

export abstract class NodeTknElement extends TknElement {
  constructor(parent: TknElement, node: YamlNode) {
    super(parent, node);
  }

  abstract collectChildren(): TknElement[];

  findElement(pos: number): TknElement | undefined {
    if (!insideElement(this, pos)) {
      return undefined;
    }
    return internalFindElement(pos, this.collectChildren());

  }
}

export class TknValueElement<T> extends LeafTknElement {
  type = TknElementType.VALUE;

  constructor(private _value: T, parent: TknElement, node: YamlNode) {
    super(parent, node);
    if (!node) {
      throw new Error(`Node cannot be undefined in 'TknValueElement'! Parent: ${parent}`);
    }

  }

  get value(): T {
    return this._value;
  }

}

function getStringValue(node: YamlScalar): string {
  let result = node.raw;
  if (node.doubleQuoted) {
    result = _.trim(result, '"');
  }

  if (node.singleQuoted) {
    result = _.trim(result, '\'');
  }

  return result;
}
export class TknStringElement extends TknValueElement<string> {
  constructor(parent: TknElement, node: YamlNode) {
    super(getStringValue(node), parent, node);
  }
}

export abstract class TknBaseRootElement extends NodeTknElement {

  private _metadata: TknMetadata;
  private _kind: TknStringElement;
  private _apiVersion: TknStringElement;
  constructor(parent: TknElement, yamlNode: YamlMap) {
    super(parent, yamlNode);
  }
  get metadata(): TknMetadata {
    if (!this._metadata) {
      this._metadata = new TknMetadata(this, tektonYaml.getMetadata(this.node as YamlMap));
    }
    return this._metadata;
  }

  get apiVersion(): TknStringElement {
    if (!this._apiVersion) {
      this._apiVersion = new TknStringElement(this, tektonYaml.getApiVersionNode(this.node as YamlMap));
    }
    return this._apiVersion;
  }

  get kind(): TknStringElement {
    if (!this._kind) {
      this._kind = new TknStringElement(this, tektonYaml.getKindNode(this.node as YamlMap));
    }
    return this._kind;
  }
}

export class TknMetadata extends NodeTknElement {

  type = TknElementType.METADATA;

  private _name: TknStringElement;
  constructor(parent: TknBaseRootElement, yamlNode: YamlMap) {
    super(parent, yamlNode);
  }

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, tektonYaml.getNameNode(this.node as YamlMap))
    }
    return this._name;
  }

  collectChildren(): TknElement[] {
    return [this.name];
  }

}

export class TknArray<T extends TknElement> extends NodeTknElement {
  private children: T[];

  constructor(public type: TknElementType, private elementConstructor: { new(parent: TknElement, node: YamlNode): T }, parent: TknElement, node: YamlSequence) {
    super(parent, node);
  }

  getChildren(): T[] {
    if (!this.children) {
      const arr = this.node as YamlSequence;
      this.children = arr.items.map(el => new this.elementConstructor(this, el));
    }

    return this.children;
  }

  collectChildren(): TknElement[] {
    return this.getChildren();
  }
}

export class TknParam extends NodeTknElement {
  type = TknElementType.PARAM;
  private _name: TknStringElement;
  private _value: TknStringElement | TknArray<TknStringElement>

  get name(): TknStringElement {
    if (!this._name) {
      this._name = new TknStringElement(this, tektonYaml.getNameNode(this.node as YamlMap))
    }
    return this._name;
  }

  get value(): TknStringElement | TknArray<TknStringElement> | undefined {
    if (!this._value) {
      const valueNode = findNodeByKey<YamlNode>('value', this.node as YamlMap);
      if (valueNode) {
        if (isSequence(valueNode)) {
          this._value = new TknArray(TknElementType.STRING_ARRAY, TknStringElement, this, valueNode);
        } else {
          this._value = new TknStringElement(this, valueNode);
        }
      }
    }

    return this._value;
  }
  collectChildren(): TknElement[] {
    return [this.name, this.value];
  }


}
