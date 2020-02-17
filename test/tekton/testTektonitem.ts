/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TektonNode, ContextType } from '../../src/tkn';

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

    getTreeItem(): any {
        return null;
    }

    getChildren(): any[] {
        return this.children;
    }

    getParent(): TektonNode {
        return this.parent;
    }

    get label(): string {
        return this.name;
    }
}
