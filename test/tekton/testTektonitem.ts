/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonNode, ContextType } from "../../src/tkn";

export class TestItem implements TektonNode {

    
    constructor(
        private parent: TektonNode,
        private name: string,
        public readonly contextValue: ContextType,
        private children = [],
        public creationtime?: string,
        public state?: string) {
    }

    getName(): string {
        return this.name;
    }

    getTreeItem() {
        return null;
    }

    getChildren() {
        return this.children;
    }

    getParent(): TektonNode {
        return this.parent;
    }

    get label(): string {
        return this.name;
    }
}