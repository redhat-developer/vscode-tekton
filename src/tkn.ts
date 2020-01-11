/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as cliInstance from './cli';
import { CliCommand, CliExitData, ICli, Cli, createCliCommand, cliCommandToString } from './cli';
import { ProviderResult, TreeItemCollapsibleState, Terminal, Uri, commands, QuickPickItem, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format = require('string-format');
import { StartPipelineObject } from './tekton/pipeline';
import humanize = require('humanize-duration');

const humanizer = humanize.humanizer(createConfig());

function createConfig(seconds: boolean = true): humanize.HumanizerOptions {
    return {
        language: 'shortEn',
        languages: {
            shortEn: {
                y: () => 'y',
                mo: () => 'mo',
                w: () => 'w',
                d: () => 'd',
                h: () => 'h',
                m: () => 'm',
                s: () => 's',
                ms: () => 'ms',
            }
        },
        round: true,
        largest: 2,
        conjunction: ' '
    };
}


export interface TektonNode extends QuickPickItem {
    contextValue: string;
    creationTime?: string;
    state?: string;
    getChildren(): ProviderResult<TektonNode[]>;
    getParent(): TektonNode;
    getName(): string;
}

export enum ContextType {
    TASK = 'task',
    TASKRUN = 'taskrun',
    PIPELINE = 'pipeline',
    PIPELINERUN = 'pipelinerun',
    CLUSTERTASK = 'clustertask',
    PIPELINENODE = 'pipelinenode',
    PIPELINERESOURCENODE = 'pipelineresourcenode',
    PIPELINERESOURCE = 'pipelineresource',
    TASKNODE = 'tasknode',
    CLUSTERTASKNODE = 'clustertasknode',
    TKN_DOWN = 'tkn_down',
}

function verbose(_target: any, key: string, descriptor: any) {
    let fnKey: string | undefined;
    let fn: Function | undefined;

    if (typeof descriptor.value === 'function') {
        fnKey = 'value';
        fn = descriptor.value;
    } else {
        throw new Error('not supported');
    }

    descriptor[fnKey] = function (...args: any[]) {
        const v: number = workspace.getConfiguration('vs-tekton').get('outputVerbosityLevel');
        const command: CliCommand = fn!.apply(this, args);
        if (v > 0) {
            command.cliArguments.push('-v', v.toString());
        }
        return command;
    };
}

function newTknCommand(...tknArguments: string[]): CliCommand {
    return createCliCommand('tkn', ...tknArguments);
}

function newOcCommand(...ocArguments: string[]): CliCommand {
    return createCliCommand('oc', ...ocArguments);
}

export class Command {
    @verbose
    static listTaskRunsforTasks(task: string): CliCommand {
        return newTknCommand('taskrun', 'list', task, '-o', 'json');
    }

    @verbose
    static listTaskRunsforTasksinTerminal(task: string): CliCommand {
        return newTknCommand('taskrun', 'list', task);
    }

    @verbose
    static startPipeline(pipelineData: StartPipelineObject): CliCommand {
        let resources: string[] = [];
        let svcAcct: string[] = pipelineData.serviceAccount ? ["-s ", pipelineData.serviceAccount] : ["-s", "pipeline"];
        pipelineData.resources.forEach(element => {
            resources.push("--resource");
            resources.push(element.name + "=" + element.resourceRef);
        });

        if (pipelineData.params.length === 0) {
            return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...svcAcct);
        }
        else {
            let params: string[] = [];
            pipelineData.params.forEach(element => {
                params.push("--param");
                params.push(element.name + "=" + element.default);
            });
            return newTknCommand('pipeline', 'start', pipelineData.name, ...resources, ...params, ...svcAcct);
        }
    }
    @verbose
    static restartPipeline(name: string): CliCommand {
        return newTknCommand('pipeline', 'start', name, '--last', '-s', 'pipeline');
    }
    @verbose
    static deletePipeline(name: string): CliCommand {
        return newTknCommand('pipeline', 'delete', name, '-f');
    }
    @verbose
    static listPipelineResources(): CliCommand {
        return newTknCommand('resource', 'list', '-o', 'json');
    }
    @verbose
    static listPipelineResourcesInTerminal(name: string): CliCommand {
        return newTknCommand('resource', 'list', name);
    }
    @verbose
    static describePipelineResource(name: string): CliCommand {
        return newTknCommand('resource', 'describe', name);
    }
    @verbose
    static deletePipelineResource(name: string): CliCommand {
        return newTknCommand('resource', 'delete', name, '-f');
    }
    @verbose
    static listPipelines(): CliCommand {
        return newTknCommand('pipeline', 'list', '-o', 'json');
    }
    @verbose
    static listPipelinesInTerminal(name: string): CliCommand {
        return newTknCommand('pipeline', 'list', name);
    }
    @verbose
    static describePipelines(name: string): CliCommand {
        return newTknCommand('pipeline', 'describe', name);
    }
    @verbose
    static listPipelineRuns(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'list', name, '-o', 'json');
    }
    @verbose
    static listPipelineRunsInTerminal(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'list', name);
    }
    @verbose
    static describePipelineRuns(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'describe', name);
    }
    @verbose
    static cancelPipelineRun(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'cancel', name);
    }
    @verbose
    static deletePipelineRun(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'delete', name, '-f');
    }
    @verbose
    static showPipelineRunLogs(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'logs', name);
    }
    @verbose
    static listTasks(namespace?: string): CliCommand {
        return newTknCommand('task', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
    @verbose
    static listTasksinTerminal(namespace?: string): CliCommand {
        return newTknCommand('task', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
    @verbose
    static listTaskRuns(namespace?: string): CliCommand {
        return newTknCommand('taskrun', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
    @verbose
    static listTaskRunsInTerminal(namespace?: string): CliCommand {
        return newTknCommand('taskrun', 'list', ...(namespace ? ['-n', namespace] : ''));
    }
    @verbose
    static deleteTask(name: string): CliCommand {
        return newTknCommand('task', 'delete', name, '-f');
    }
    @verbose
    static listClusterTasks(namespace?: string): CliCommand {
        return newTknCommand('clustertask', 'list', ...(namespace ? ['-n', namespace] : ''), '-o', 'json');
    }
    static listClusterTasksinTerminal(namespace?: string): CliCommand {
        return newTknCommand('clustertask', 'list', ...(namespace ? ['-n', namespace] : ''));
    }
    @verbose
    static deleteClusterTask(name: string): CliCommand {
        return newTknCommand('clustertask', 'delete', name, '-f');
    }
    @verbose
    static showTaskRunLogs(name: string): CliCommand {
        return newTknCommand('taskrun', 'logs', name);
    }
    @verbose
    static deleteTaskRun(name: string): CliCommand {
        return newTknCommand('taskrun', 'delete', name, '-f');
    }
    @verbose
    static printTknVersion(): CliCommand {
        return newTknCommand('version');
    }

    static showPipelineRunFollowLogs(name: string): CliCommand {
        return newTknCommand('pipelinerun', 'logs', name, '-f');
    }
    static showTaskRunFollowLogs(name: string): CliCommand {
        return newTknCommand('taskrun', 'logs', name, '-f');
    }

    static tknStatus() {
        return newOcCommand('auth', 'can-i', 'create', 'pipeline.tekton.dev', '&&', 'oc', 'get', 'pipeline.tekton.dev' );
    }

}

export class TektonNodeImpl implements TektonNode {
    private readonly CONTEXT_DATA = {
        pipelinenode: {
            icon: 'pipe.png',
            tooltip: 'Pipelines: {label}',
            getChildren: () => this.tkn.getPipelines(this)
        },
        pipelineresourcenode: {
            icon: 'pipe.png',
            tooltip: 'PipelineResources: {label}',
            getChildren: () => this.tkn.getPipelineResources(this)
        },
        pipelineresource: {
            icon: 'pipe.png',
            tooltip: 'PipelineResources: {label}',
            getChildren: () => []
        },
        tasknode: {
            icon: 'task.png',
            tooltip: 'Tasks: {label}',
            getChildren: () => this.tkn.getTasks(this)
        },
        clustertasknode: {
            icon: 'clustertask.png',
            tooltip: 'ClusterTasks: {label}',
            getChildren: () => this.tkn.getClusterTasks(this)
        },
        pipeline: {
            icon: 'pipe.png',
            tooltip: 'Pipeline: {label}',
            getChildren: () => this.tkn.getPipelineRuns(this)
        },
        pipelinerun: {
            icon: 'running.png',
            tooltip: 'PipelineRun: {label}',
            getChildren: () => this.tkn.getTaskRuns(this)
        },
        task: {
            icon: 'task.png',
            tooltip: 'Task: {label}',
            getChildren: () => this.tkn.getTaskRunsforTasks(this)
        },
        taskrun: {
            icon: 'running.png',
            tooltip: 'TaskRun: {label}',
            getChildren: () => []
        },
        clustertask: {
            icon: 'clustertask.png',
            tooltip: 'Clustertask: {label}',
            getChildren: () => this.tkn.getTaskRunsforTasks(this)
        },
        tkn_down: {
            icon: 'tkn-down.png',
            tooltip: 'Cannot connect to the tekton',
            getChildren: () => []
        },
    };

    constructor(private parent: TektonNode,
        public readonly name: string,
        public readonly contextValue: ContextType,
        private readonly tkn: Tkn,
        public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
        public readonly creationTime?: string,
        public readonly state?: string) {

    }

    get iconPath(): Uri {
        if (this.state) {
            let fileName = 'running.png';
            if (this.state) {
                switch (this.state) {
                    case "False": {
                        fileName = 'failed.png';
                        break;
                    }
                    case "True": {
                        fileName = 'success.png';
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
            return Uri.file(path.join(__dirname, "../../images", fileName));
        }
        return Uri.file(path.join(__dirname, "../../images", this.CONTEXT_DATA[this.contextValue].icon));
    }

    get tooltip(): string {
        return format(this.CONTEXT_DATA[this.contextValue].tooltip, this);
    }

    get label(): string {
        return this.name;
    }

    getName(): string {
        return this.name;
    }

    getChildren(): ProviderResult<TektonNode[]> {
        return this.CONTEXT_DATA[this.contextValue].getChildren();
    }

    getParent(): TektonNode {
        return this.parent;
    }

}

type PipelineTaskRunData = {
    metadata: {
        creationTimestamp: string,
        name: string,
        labels: {
            'tekton.dev/pipelineTask': string,
            'tekton.dev/pipelineRun': string
        }
    },
    status: {
        completionTime: string;
        conditions: [{
            status: string
        }]
    },
    spec: {
        taskRef: {
            name: string
        }
    }
};


export class TaskRun extends TektonNodeImpl {
    private started: string;
    private finished: string;
    private shortName: string;
    constructor(parent: TektonNode,
        name: string,
        tkn: Tkn,
        item: PipelineTaskRunData) {
        super(parent, name, ContextType.TASKRUN, tkn, TreeItemCollapsibleState.None, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
        // destructuring assignment to save only required data from 
        ({
            metadata: {
                creationTimestamp: this.started,
                labels: {
                    'tekton.dev/pipelineTask': this.shortName
                }
            }, status: {
                completionTime: this.finished
            }
        } = item);

    }

    get label(): string {
        return this.shortName;
    }

    get description(): string {
        let r = '';
        if (this.getParent().contextValue === ContextType.TASK) {
            if (this.finished) {
                r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
            } else {
                r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, running for ' + humanizer(Date.now() - Date.parse(this.started));
            }
        } else {
            if (this.finished) {
                r = 'finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
            } else {
                r = 'running for ' + humanizer(Date.now() - Date.parse(this.started));
            }
        }
        return r;
    }
}


type PipelineRunData = {
    metadata: {
        creationTimestamp: string,
        name: string,
        generateName: string
    },
    spec: {
        pipelineRef: {
            name: string
        }
    },
    status: {
        completionTime: string;
        conditions: [{
            status: string
        }]
    }
};

export class PipelineRun extends TektonNodeImpl {
    private started: string;
    private finished: string;
    private generateName: string;
    constructor(parent: TektonNode,
        name: string,
        tkn: Tkn,
        item: PipelineRunData) {
        super(parent, name, ContextType.PIPELINERUN, tkn, TreeItemCollapsibleState.Expanded, item.metadata.creationTimestamp, item.status ? item.status.conditions[0].status : '');
        // destructuring assignment to save only required data from
        ({
            metadata: {
                creationTimestamp: this.started,
                generateName: this.generateName
            }, status: {
                completionTime: this.finished
            }
        } = item);
    }

    get label(): string {
        return this.name.substr(this.generateName.length);
    }

    get description(): string {
        let r = '';
        if (this.finished) {
            r = 'started ' + humanizer(Date.now() - Date.parse(this.started)) + ' ago, finished in ' + humanizer(Date.parse(this.finished) - Date.parse(this.started));
        } else {
            r = 'running for ' + humanizer(Date.now() - Date.parse(this.started));
        }
        return r;
    }
}

export interface Tkn {
    getPipelineNodes(): Promise<TektonNode[]>;
    startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]>;
    restartPipeline(pipeline: TektonNode): Promise<void>;
    getPipelines(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]>;
    getTasks(task: TektonNode): Promise<TektonNode[]>;
    getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]>;
    execute(command: CliCommand, cwd?: string, fail?: boolean): Promise<CliExitData>;
    executeInTerminal(command: CliCommand, cwd?: string): void;
    getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]>;
    clearCache?(): void;
}

export function getInstance(): Tkn {
    return TknImpl.Instance;
}

function compareNodes(a, b): number {
    if (!a.contextValue) { return -1; }
    if (!b.contextValue) { return 1; }
    const t = a.contextValue.localeCompare(b.contextValue);
    return t ? t : a.label.localeCompare(b.label);
}

function compareTime(a, b): number {
    const aTime = Date.parse(a.creationTime);
    const bTime = Date.parse(b.creationTime);
    return aTime < bTime ? -1 : 1;
}

export class TknImpl implements Tkn {

    public static ROOT: TektonNode = new TektonNodeImpl(undefined, 'root', undefined, undefined);
    private cache: Map<TektonNode, TektonNode[]> = new Map();
    private static cli: ICli = Cli.getInstance();
    private static instance: Tkn;

    private constructor() { }

    public static get Instance(): Tkn {
        if (!TknImpl.instance) {
            TknImpl.instance = new TknImpl();
        }
        return TknImpl.instance;
    }

    async getPipelineNodes(): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(
            Command.tknStatus(), process.cwd(), false
        );
        if (result.stdout.trim() === 'no') {
            const tknDownMsg: string = `The current user doesn't have the privileges to interact with tekton resources.` ;
            return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, TknImpl.instance, TreeItemCollapsibleState.None)];
        }
        if (result.stderr.indexOf(`the server doesn't have a resource type "pipeline"`) > -1) {
            const tknDownMsg: string = 'Please install the OpenShift Pipelines Operator.';
            return [new TektonNodeImpl(null, tknDownMsg, ContextType.TKN_DOWN, TknImpl.instance, TreeItemCollapsibleState.None)];
        }
        if (!this.cache.has(TknImpl.ROOT)) {
            this.cache.set(TknImpl.ROOT, await this._getPipelineNodes());
        }
        return this.cache.get(TknImpl.ROOT);
    }

    public async _getPipelineNodes(): Promise<TektonNode[]> {
        let pipelineTree: TektonNode[] = [];
        let pipelineNode = new TektonNodeImpl(TknImpl.ROOT, "Pipelines", ContextType.PIPELINENODE, this, TreeItemCollapsibleState.Collapsed);
        let taskNode = new TektonNodeImpl(TknImpl.ROOT, "Tasks", ContextType.TASKNODE, this, TreeItemCollapsibleState.Collapsed);
        let clustertaskNode = new TektonNodeImpl(TknImpl.ROOT, "ClusterTasks", ContextType.CLUSTERTASKNODE, this, TreeItemCollapsibleState.Collapsed);
        let pipelineResourceNode = new TektonNodeImpl(TknImpl.ROOT, "PipelineResources", ContextType.PIPELINERESOURCENODE, this, TreeItemCollapsibleState.Collapsed);
        pipelineTree.push(pipelineNode, taskNode, clustertaskNode, pipelineResourceNode);
        this.cache.set(pipelineNode, await this.getPipelines(pipelineNode));
        this.cache.set(taskNode, await this.getTasks(taskNode));
        this.cache.set(clustertaskNode, await this.getClusterTasks(clustertaskNode));
        this.cache.set(pipelineResourceNode, await this.getPipelineResources(pipelineResourceNode));
        return pipelineTree;

    }

    async getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
        let pipelineRuns: TektonNode[] = this.cache.get(pipeline);
        if (!pipelineRuns) {
            pipelineRuns = await this._getPipelineRuns(pipeline);
            this.cache.set(pipeline, pipelineRuns);
        }
        return pipelineRuns;
    }

    async _getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> | undefined {
        const result = await this.execute(Command.listPipelineRuns(pipeline.getName()));
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipeline, result.stderr, ContextType.PIPELINERUN, this, TreeItemCollapsibleState.None)];
        }

        let data: PipelineRunData[] = [];
        try {
            let r = JSON.parse(result.stdout);
            data = r.items ? r.items : data;
        } catch (ignore) {
        }

        return data
            .filter((value) => value.spec.pipelineRef.name === pipeline.getName())
            .map((value) => new PipelineRun(pipeline, value.metadata.name, this, value))
            .sort(compareTime);
    }

    public async getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
        let taskruns: TektonNode[] = this.cache.get(task);
        if (!taskruns) {
            taskruns = await this._getTaskRunsforTasks(task);
            this.cache.set(task, taskruns);
        }
        return taskruns;
    }

    async _getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
        const result = await this.execute(Command.listTaskRunsforTasks(task.getName()));
        if (result.stderr) {
            console.log(result + " Std.err when processing taskruns for " + task.getName());
            return [new TektonNodeImpl(task, result.stderr, ContextType.TASKRUN, this, TreeItemCollapsibleState.None)];
        }
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
        }
        return data
            .filter((value) => value.spec.taskRef.name === task.getName())
            .map((value) => new TaskRun(task, value.metadata.name, this, value))
            .sort(compareTime);
    }

    async getTaskRuns(pipelineRun: TektonNode): Promise<TektonNode[]> {
        let taskRuns: TektonNode[] = this.cache.get(pipelineRun);
        if (!taskRuns) {
            taskRuns = await this._getTaskRuns(pipelineRun);
            this.cache.set(pipelineRun, taskRuns);
        }
        return taskRuns;
    }

    async _getTaskRuns(pipelinerun: TektonNode): Promise<TektonNode[]> {
        const result = await this.execute(Command.listTaskRuns());
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipelinerun, result.stderr, ContextType.TASKRUN, this, TreeItemCollapsibleState.Expanded)];
        }
        let data: PipelineTaskRunData[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
        }

        return data
            .filter((value) => value.metadata.labels["tekton.dev/pipelineRun"] === pipelinerun.getName())
            .map((value) => new TaskRun(pipelinerun, value.metadata.name, this, value))
            .sort(compareTime);
    }

    async getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
        return (await this._getPipelines(pipeline));
    }

    async _getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        const result = await this.execute(Command.listPipelines(), process.cwd(), false);
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipeline, result.stderr, ContextType.PIPELINE, this, TreeItemCollapsibleState.Expanded)];
        }
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
            //show no pipelines if output is not correct json
        }
        let pipelines: string[] = data.map((value) => value.metadata.name);
        pipelines = [...new Set(pipelines)];
        const treeState = pipelines.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        return pipelines.map<TektonNode>((value) => new TektonNodeImpl(pipeline, value, ContextType.PIPELINE, this, treeState)).sort(compareNodes);
    }

    async getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]> {
        return (await this._getPipelineResources(pipelineResources));
    }

    private async _getPipelineResources(pipelineResource: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        const result = await this.execute(Command.listPipelineResources(), process.cwd(), false);
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipelineResource, result.stderr, ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.Expanded)];
        }
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
            //show no pipelines if output is not correct json
        }
        let pipelineresources: string[] = data.map((value) => value.metadata.name);
        return pipelineresources.map<TektonNode>((value) => new TektonNodeImpl(pipelineResource, value, ContextType.PIPELINERESOURCE, this, TreeItemCollapsibleState.None)).sort(compareNodes);
    }

    public async getTasks(task: TektonNode): Promise<TektonNode[]> {
        return (await this._getTasks(task));
    }

    async _getTasks(task: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        const result = await this.execute(Command.listTasks());
        if (result.stderr) {
            console.log(result + "Std.err when processing tasks");
            return [new TektonNodeImpl(task, result.stderr, ContextType.TASK, this, TreeItemCollapsibleState.Expanded)];
        }
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let tasks: string[] = data.map((value) => value.metadata.name);
        tasks = [...new Set(tasks)];
        return tasks.map<TektonNode>((value) => new TektonNodeImpl(task, value, ContextType.TASK, this, TreeItemCollapsibleState.Collapsed)).sort(compareNodes);
    }

    async getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        return (await this._getClusterTasks(clustertask));
    }

    async _getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        try {
            const result = await this.execute(Command.listClusterTasks());
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let tasks: string[] = data.map((value) => value.metadata.name);
        tasks = [...new Set(tasks)];
        return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value, ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed)).sort(compareNodes);
    }

    async startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]> {
        const result = await this.execute(Command.startPipeline(pipeline));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let pipelines: string[] = data.map((value) => value.metadata.name);
        pipelines = [...new Set(pipelines)];
        const treeState = pipelines.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        return pipelines.map<TektonNode>((value) => new TektonNodeImpl(undefined, value, ContextType.PIPELINE, this, treeState)).sort(compareNodes);
    }

    async restartPipeline(pipeline: TektonNode): Promise<void> {
        await this.executeInTerminal(Command.restartPipeline(pipeline.getName()));
    }

    public async executeInTerminal(command: CliCommand, cwd: string = process.cwd(), name: string = 'Tekton') {
        let toolLocation = await ToolsConfig.detectOrDownload();
        if (toolLocation) {
            toolLocation = path.dirname(toolLocation);
        }
        const terminal: Terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
        terminal.sendText(cliCommandToString(command), true);
        terminal.show();
    }

    public async execute(command: CliCommand, cwd?: string, fail: boolean = true): Promise<CliExitData> {
        const toolLocation = await ToolsConfig.detectOrDownload();
        if (toolLocation) {
            command.cliCommand = command.cliCommand.replace('tkn', `"${toolLocation}"`).replace(new RegExp(`&& tkn`, 'g'), `&& "${toolLocation}"`);
        }


        return TknImpl.cli.execute(command, cwd ? { cwd } : {})
            .then(async (result) => result.error && fail ? Promise.reject(result.error) : result)
            .catch((err) => fail ? Promise.reject(err) : Promise.resolve({ error: null, stdout: '', stderr: '' }));
    }

    clearCache() {
        this.cache.clear();
    }
}
