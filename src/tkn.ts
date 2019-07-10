import * as cliInstance from './cli';
import { ProviderResult, TreeItemCollapsibleState, window, Terminal, Uri, commands, QuickPickItem, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import { CliExitData } from './cli';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format = require('string-format');
import { PipelineExplorer } from './pipeline/pipelineExplorer';
import { wait } from './util/async';
import { statSync } from 'fs';
import bs = require('binary-search');
import { Platform } from './util/platform';
import { pipeline } from 'stream';

export interface TektonNode extends QuickPickItem {
    contextValue: string;
    comptype?: string;
    getChildren(): ProviderResult<TektonNode[]>;
    getParent(): TektonNode;
    getName(): string;
}

export enum ContextType {
    TASK = 'task',
    TASKRUN = 'taskrun',
    PIPELINE = 'pipeline',
    PIPELINERUN = 'pipelinerun',
    CLUSTERTASK = 'clustertask'
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
        const v = workspace.getConfiguration('vs-tekton').get('outputVerbosityLevel');
        const command = fn!.apply(this, args);
        return command + (v > 0 ? ` -v ${v}` : '');
    };
}

export class Command {
    @verbose
    static startPipeline(name: string) {
        return `tkn pipeline start ${name}`;
    }
    @verbose
    static listPipelines() {
        return `tkn pipeline list -o json`;
    }
    @verbose
    static describePipelines(name: string) {
        return `tkn pipeline describe`;
    }
    @verbose
    static listPipelineRuns(name: string) {
        return `tkn pipelinerun list -o json`;
    }
    @verbose
    static describePipelineRuns(name: string) {
        return `tkn pipelinerun describe ${name}`;
    }
    @verbose
    static showPipelineRunLogs(name: string) {
        return `tkn pipelinerun logs ${name}`;
    }
    @verbose
    static listTasks(name: string) {
        return `tkn task list ${name} -o json`;
    }
    @verbose
    static listTaskRuns(name: string) {
        return `tkn taskrun list ${name} -o json`;
    }
    @verbose
    static listClusterTasks(name: string) {
        return `tkn clustertask list ${name} -o json`;
    }
    /*     static describeTaskRuns(name: string) {
            return 'tkn taskrun list ${name}';
        } */
    @verbose
    static showTaskRunLogs(name: string) {
        return `tkn taskrun logs ${name}`;
    }
    @verbose
    static printTknVersion() {
        return `tkn version`;
    }
    @verbose
    static addNewPipelineFromFolder(pipeline: TektonNode, path: string) {
        return `tkn pipeline start ${path}`;
    }
    static pushPipeline(pipeline: TektonNode): string {
        return "A string";
    }
    //TODO: Watch components as per odo so that we can reconcile pipeline view properly
    //TODO: Create and delete pipelines
    //TODO: Should Clustertasks also be found by tkn?
}

export class TektonNodeImpl implements TektonNode {
    private readonly CONTEXT_DATA = {
        pipeline: {
            icon: 'pipe.png',
            tooltip: 'Pipeline: {label}',
            getChildren: () => this.tkn.getPipelineChildren(this)
        },
        pipelinerun: {
            icon: 'pipe.png',
            tooltip: 'PipelineRun: {label}',
            getChildren: () => this.tkn.getPipelineRunChildren(this)
        },
        task: {
            icon: 'task.png',
            tooltip: 'Task: {label}',
            getChildren: () => []
        },
        taskrun: {
            icon: 'task.png',
            tooltip: 'TaskRun: {label}',
            getChildren: () => []
        },
        clustertask: {
            icon: 'clustertask.png',
            tooltip: 'Clustertask: {label}',
            getChildren: () => []
        }
    };

    constructor(private parent: TektonNode,
        public readonly name: string,
        public readonly contextValue: ContextType,
        private readonly tkn: Tkn,
        public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed,
        public readonly comptype?: string) {

    }

    get iconPath(): Uri {
        return Uri.file(path.join(__dirname, "../images", this.CONTEXT_DATA[this.contextValue].icon));
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

export interface Tkn {
    getPipelineResources(): Promise<TektonNode[]>;
    startPipeline(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelines(pipeline: TektonNode): Promise<TektonNode[]>;
    describePipeline(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
    describePipelineRun(pipelineRun: TektonNode): Promise<TektonNode[]>;
    showPipelineRunLogs(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getTasks(task: TektonNode): Promise<TektonNode[]>;
    //    describeTask(task: TektonNode): Promise<TektonNode[]>;
    getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    showTaskRunLogs(taskRun: TektonNode): Promise<TektonNode[]>;
    //    describeTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]>;
    describeClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]>;
    execute(command: string, cwd?: string, fail?: boolean): Promise<CliExitData>;
    executeInTerminal(command: string, cwd?: string): void;
    addPipelineFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode>;
    addTaskFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode>;
    addClusterTaskFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode>;
    getPipelineChildren(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRunChildren(pipelinerun: TektonNode): Promise<TektonNode[]>;
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

export class TknImpl implements Tkn {

    private ROOT: TektonNode = new TektonNodeImpl(undefined, 'root', undefined, undefined);
    private cache: Map<TektonNode, TektonNode[]> = new Map();
    private static cli: cliInstance.ICli = cliInstance.Cli.getInstance();
    private static instance: Tkn;

    private constructor() {}

    public static get Instance(): Tkn {
        if (!TknImpl.instance) {
            TknImpl.instance = new TknImpl();
        }
        return TknImpl.instance;
    }
    async getPipelineResources(): Promise<TektonNode[]> {
        if (!this.cache.has(this.ROOT)) {
            this.cache.set(this.ROOT, await this._getPipelineResources());
        }
        return this.cache.get(this.ROOT);
    }

    public async _getPipelineResources(): Promise<TektonNode[]> {
        let pipelineTree: any[] = [];
        let pipelineNode = new TektonNodeImpl(this.ROOT, "Pipelines", ContextType.PIPELINE, this, TreeItemCollapsibleState.Collapsed);
        let taskNode = new TektonNodeImpl(this.ROOT, "Tasks", ContextType.TASK, this, TreeItemCollapsibleState.Collapsed);
        //let clustertaskNode = new TektonNodeImpl(this.ROOT, "Clustertasks", ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed);
        this.cache.set(this.ROOT, pipelineTree);
        pipelineTree.push(pipelineNode,taskNode);
        this.cache.set(pipelineNode, await this.getPipelines(pipelineNode));
        this.cache.set(taskNode, await this.getTasks(taskNode));
  //      let clustertasks: TektonNode[] = await this.getClusterTasks();
  //      tree.push(clustertasks);
        return this.cache.get(this.ROOT);

    }

    public async getPipelineChildren(pipeline: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipeline)) {
            this.cache.set(pipeline, await this._getPipelineChildren(pipeline));
        }
        return this.cache.get(pipeline);
    }
    async _getPipelineChildren(pipeline: TektonNode): Promise<TektonNode[]> {
        return [...await this._getPipelineRuns(pipeline)].filter((value) => value.getParent().getName() === pipeline.getName()).sort(compareNodes);
    }
    
    async getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipeline)) {
            this.cache.set(pipeline, await this._getPipelineRuns(pipeline));
        }
        return this.cache.get(pipeline);
    } 

    async _getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
        //TODO: use namespace instead of empty string
        const result: cliInstance.CliExitData = await this.execute(Command.listPipelineRuns(""));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        const pipelinerunObject = data.map(value => ({ name: value.metadata.name, parent: value.spec.pipelineRef.name })).filter(function(obj) {
            return obj.parent === pipeline.getName();
        });
        
        return pipelinerunObject.map<TektonNode>((value) => {
            return new TektonNodeImpl(pipeline, value.name, ContextType.PIPELINERUN, this, TreeItemCollapsibleState.Collapsed);
        });
    }

    public async getPipelineRunChildren(pipelinerun: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipelinerun)) {
            this.cache.set(pipelinerun, await this._getPipelineRunChildren(pipelinerun));
        }
        return this.cache.get(pipelinerun);
    }

    public async _getPipelineRunChildren(pipelinerun: TektonNode): Promise<TektonNode[]> {
        return [...await this._getTaskRuns(pipelinerun)].sort(compareNodes);
    }

    async _getTaskRuns(pipelinerun: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listTaskRuns(""));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        const taskrunObject = data.map(value => ({ name: value.metadata.name, owner: value.metadata.ownerReferences?value.metadata.ownerReferences[0].name:"" })).filter(function(obj) {
            return obj.owner === pipelinerun.getName();
        });
        return taskrunObject.map<TektonNode>((value) => {
            return new TektonNodeImpl(pipelinerun, value.name, ContextType.TASKRUN, this, TreeItemCollapsibleState.None);
        });
    }
//TODO: Account for empty tasks
    async _getTasks(task: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listTasks(""));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let tasks: string[] = data.map((value) => value.metadata.name); 
        tasks = [...new Set(tasks)];
        const treeState = tasks.length>0?TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        return tasks.map<TektonNode>((value) => new TektonNodeImpl(task, value, ContextType.TASK, this, treeState)).sort(compareNodes);
    }

    async getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
       return (await this._getPipelines(pipeline));
    }

    public async _getPipelines(pipeline: TektonNode): Promise<TektonNode[]> {
        let pipelines: TektonNode[] = await this.getPipelinesWithTkn(pipeline);
        if (pipelines.length === 0) {
            console.log("No pipelines detected");
        }
        return pipelines;
    }
    private async getPipelinesWithTkn(pipeline: TektonNode): Promise<TektonNode[]> {
        let data: TektonNode[] = [];
        const result: cliInstance.CliExitData = await this.execute(Command.listPipelines(), process.cwd(), false);
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

    public async getTasks(task: TektonNode): Promise<TektonNode[]> {
        return (await this._getTasks(task));
    }

    async getTaskRuns(pipelineRun: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipelineRun)) {
            this.cache.set(pipelineRun, await this._getTaskRuns(pipelineRun));
        }
        return this.cache.get(pipelineRun);
    }
    async getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        return (await this._getClusterTasks(clustertask));
    }

    async _getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listClusterTasks(""));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let tasks: string[] = data.map((value) => value.metadata.name); 
        tasks = [...new Set(tasks)];
        const treeState = tasks.length>0?TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value, ContextType.TASK, this, treeState)).sort(compareNodes);
    }

    startPipeline(pipeline: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    describePipeline(pipeline: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    describePipelineRun(pipelineRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    getPipelineRunLogs(pipelineRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    getTaskRunLogs(taskRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    describeClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }

    public async executeInTerminal(command: string, cwd: string = process.cwd(), name: string = 'Tekton') {
        let toolLocation = await ToolsConfig.detectOrDownload();
        if (toolLocation) {
            toolLocation = path.dirname(toolLocation);
        }
        const terminal: Terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
        terminal.sendText(command, true);
        terminal.show();
    }

    public async execute(command: string, cwd?: string, fail: boolean = true): Promise<CliExitData> {
        const toolLocation = await ToolsConfig.detectOrDownload();
        return TknImpl.cli.execute(
            toolLocation ? command.replace('tkn', `"${toolLocation}"`).replace(new RegExp(`&& tkn`, 'g'), `&& "${toolLocation}"`) : command,
            cwd ? { cwd } : {}
        ).then(async (result) => result.error && fail ? Promise.reject(result.error) : result).catch((err) => fail ? Promise.reject(err) : Promise.resolve({ error: null, stdout: '', stderr: '' }));
    }

    private insertAndReveal(array: TektonNode[], item: TektonNode): TektonNode {
        const i = bs(array, item, compareNodes);
        array.splice(Math.abs(i) - 1, 0, item);
        PipelineExplorer.getInstance().reveal(item);
        return item;
    }
    showPipelineRunLogs(pipelineRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    showTaskRunLogs(taskRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    addTaskFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode> {
        throw new Error("Method not implemented.");
    }
    addClusterTaskFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode> {
        throw new Error("Method not implemented.");
    }
    pushPipeline(pipeline: TektonNode) {
        throw new Error("Method not implemented.");
    }
    public async addPipelineFromFolder(pipeline: TektonNode, path: string): Promise<TektonNode> {
        await this.execute(Command.startPipeline(pipeline.getParent().getName()));
        this.executeInTerminal(Command.pushPipeline(pipeline), "randomstring1", "randomstring2");
        return this.insertAndReveal(await this.getPipelines(pipeline), new TektonNodeImpl(pipeline, "test", ContextType.PIPELINE, this, TreeItemCollapsibleState.Collapsed, 'folder'));
    }

    clearCache() {
        this.cache.clear();
    }
}