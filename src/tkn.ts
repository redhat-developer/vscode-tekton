import * as cliInstance from './cli';
import { ProviderResult, TreeItemCollapsibleState, Terminal, Uri, commands, QuickPickItem, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import { CliExitData } from './cli';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format = require('string-format');
import { StartPipelineObject } from './tekton/pipeline';

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
    CLUSTERTASKNODE = 'clustertasknode'
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
    static listTaskRunsforTasks(task: string): string {
        return `tkn taskrun list ${task} -o json`;
    }

    @verbose
    static listTaskRunsforTasksinTerminal(task: string): string {
        return `tkn taskrun list ${task}`;
    }

    @verbose
    static startPipeline(pipelineData: StartPipelineObject) {
        let resources: string[] = [];
        let svcAcct : string = pipelineData.serviceAccount? "--serviceaccount "+ pipelineData.serviceAccount : "";
        pipelineData.resources.forEach(element => {
            resources.push("--resource " + element.name + "=" + element.resourceRef);
        });
        const resString = resources.join(' ');

        if (pipelineData.params.length === 0) {
            return `tkn pipeline start ${pipelineData.name} ${resString} ${svcAcct}`;
        }
        else {
            let params: string[] = [];
            pipelineData.params.forEach(element => {
                params.push("--param " + element.name + "=" + element.default);
            });
            const paramString = params.join(" ");
            return `tkn pipeline start ${pipelineData.name} ${resString} ${paramString} ${svcAcct}`;
        }
    }
    @verbose
    static restartPipeline(name: string) {
        return `tkn pipeline start ${name} --last`;
    }
    @verbose
    static deletePipeline(name: string) {
        return `tkn pipeline delete ${name}`;
    }
    @verbose
    static listPipelineResources() {
        return `tkn resource list -o json`;
    }
    @verbose
    static listPipelineResourcesInTerminal(name: string) {
        return `tkn resource list ${name}`;
    }
    @verbose
    static describePipelineResource(name: string) {
        return `tkn resource describe ${name}`;
    }
    @verbose
    static deletePipelineResource(name: string) {
        return `tkn resource delete ${name}`;
    }
    @verbose
    static listPipelines() {
        return `tkn pipeline list -o json`;
    }
    @verbose
    static listPipelinesInTerminal(name: string) {
        return `tkn pipeline list ${name}`;
    }
    @verbose
    static describePipelines(name: string) {
        return `tkn pipeline describe ${name}`;
    }
    @verbose
    static listPipelineRuns(name: string) {
        return `tkn pipelinerun list ${name} -o json`;
    }
    @verbose
    static listPipelineRunsInTerminal(name: string) {
        return `tkn pipelinerun list ${name}`;
    }
    @verbose
    static describePipelineRuns(name: string) {
        return `tkn pipelinerun describe ${name}`;
    }
      @verbose
    static cancelPipelineRun(name: string) {
        return `tkn pipelinerun cancel ${name}`;
    }
    @verbose
    static deletePipelineRun(name: string) {
        return `tkn pipelinerun delete ${name}`;
    }
    @verbose
    static showPipelineRunLogs(name: string) {
        return `tkn pipelinerun logs ${name}`;
    }
    @verbose
    static listTasks(namespace?: string) {
        return `tkn task list ${namespace ? '-n ' + namespace : ''} -o json`;
    }
    @verbose
    static listTasksinTerminal(namespace?: string) {
        return `tkn task list ${namespace ? '-n ' + namespace : ''} -o json`;
    }
    @verbose
    static listTaskRuns(namespace?: string) {
        return `tkn taskrun list ${namespace ? '-n ' + namespace : ''} -o json`;
    }
    @verbose
    static listTaskRunsInTerminal(namespace?: string) {
        return `tkn taskrun list ${namespace ? '-n ' + namespace : ''}`;
    }
    @verbose
    static deleteTask(name: string) {
        return `tkn task delete ${name}`;
    }
    @verbose
    static listClusterTasks(namespace?: string) {
        return `tkn clustertask list ${namespace ? '-n ' + namespace : ''} -o json`;
    }
    static listClusterTasksinTerminal(namespace?: string) {
        return `tkn clustertask list ${namespace ? '-n ' + namespace : ''}`;
    }
    @verbose
    static deleteClusterTask(name: string) {
        return `tkn task delete ${name}`;
    }
    @verbose
    static showTaskRunLogs(name: string) {
        return `tkn taskrun logs ${name}`;
    }
    @verbose
    static deleteTaskRun(name: string) {
        return `tkn taskrun delete ${name}`;
    }
    @verbose
    static printTknVersion() {
        return `tkn version`;
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
            getChildren: () => this.tkn.getPipelineChildren(this)
        },
        pipelinerun: {
            icon: 'running.png',
            tooltip: 'PipelineRun: {label}',
            getChildren: () => this.tkn.getPipelineRunChildren(this)
        },
        task: {
            icon: 'task.png',
            tooltip: 'Task: {label}',
            getChildren: () => this.tkn.getTaskChildren(this)
        },
        taskrun: {
            icon: 'running.png',
            tooltip: 'TaskRun: {label}',
            getChildren: () => []
        },
        clustertask: {
            icon: 'clustertask.png',
            tooltip: 'Clustertask: {label}',
            getChildren: () => this.tkn.getClusterTaskChildren(this)
        }
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

export interface Tkn {
    getPipelineNodes(): Promise<TektonNode[]>;
    startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]>;
    restartPipeline(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelines(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]>;
    getTasks(task: TektonNode): Promise<TektonNode[]>;
    getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]>;
    execute(command: string, cwd?: string, fail?: boolean): Promise<CliExitData>;
    executeInTerminal(command: string, cwd?: string): void;
    getPipelineChildren(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRunChildren(pipelinerun: TektonNode): Promise<TektonNode[]>;
    getTaskChildren(task: TektonNode): Promise<TektonNode[]>;
    getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]>;
    getClusterTaskChildren(clustertask: TektonNode): Promise<TektonNode[]>;
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
    private static cli: cliInstance.ICli = cliInstance.Cli.getInstance();
    private static instance: Tkn;

    private constructor() { }

    public static get Instance(): Tkn {
        if (!TknImpl.instance) {
            TknImpl.instance = new TknImpl();
        }
        return TknImpl.instance;
    }
    async getPipelineNodes(): Promise<TektonNode[]> {
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

    public async getPipelineChildren(pipeline: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipeline)) {
            this.cache.set(pipeline, await this.getPipelineRuns(pipeline));
        }
        return this.cache.get(pipeline);
    }

    async getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> {
        let pipelineruns: TektonNode[] = await this._getPipelineRuns(pipeline);
        if (!pipelineruns) {
            return null;
        }
        else {
            if (!this.cache.has(pipeline)) {
                const matchingruns = pipelineruns.filter((value) => value.getParent().getName() === pipeline.getName());
                this.cache.set(pipeline, matchingruns);
            }
        }
        return this.cache.get(pipeline);
    }

    async _getPipelineRuns(pipeline: TektonNode): Promise<TektonNode[]> | undefined {
        const result: cliInstance.CliExitData = await this.execute(Command.listPipelineRuns(pipeline.getName()));
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipeline, result.stderr, ContextType.PIPELINERUN, this, TreeItemCollapsibleState.Expanded)];
        }
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        if (!data) { return data; }
        const pipelinerunObject = data.map(value => ({ name: value.metadata.name, parent: value.spec.pipelineRef.name, creationTime: value.metadata.creationTimestamp, state: value.status ? value.status.conditions[0].status : "" })).filter(function (obj) {
            return obj.parent === pipeline.getName();
        });

        return pipelinerunObject.map<TektonNode>((value) => {
            return new TektonNodeImpl(pipeline, value.name, ContextType.PIPELINERUN, this, TreeItemCollapsibleState.Collapsed, value.creationTime, value.state);
        }).sort(compareTime);
    }

    public async getPipelineRunChildren(pipelinerun: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(pipelinerun)) {
            this.cache.set(pipelinerun, await this.getTaskRuns(pipelinerun));
        }
        return this.cache.get(pipelinerun);
    }

    public async getTaskChildren(task: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(task)) {
            this.cache.set(task, await this.getTaskRunsforTasks(task));
        }
        return this.cache.get(task);
    }

    public async getClusterTaskChildren(clustertask: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(clustertask)) {
            this.cache.set(clustertask, await this.getTaskRunsforTasks(clustertask));
        }
        return this.cache.get(clustertask);
    }

    public async getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
        let taskruns: TektonNode[] = await this._getTaskRunsforTasks(task);
        if (!taskruns) {
            return null;
        }
        else {
            if (!this.cache.has(task)) {
                this.cache.set(task, await this._getTaskRunsforTasks(task));
            }
        }
        return this.cache.get(task);
    }

    async _getTaskRunsforTasks(task: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listTaskRunsforTasks(task.getName()));
        if (result.stderr) {
            console.log(result + " Std.err when processing taskruns for " + task.getName());
            return [new TektonNodeImpl(task, result.stderr, ContextType.TASKRUN, this, TreeItemCollapsibleState.None)];
        }
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
        }
        const taskrunObject = data.map(value => ({ name: value.metadata.name, owner: value.spec.taskRef.name, creationTime: value.metadata.creationTimestamp, state: value.status ? value.status.conditions[0].status : "" })).filter(function (obj) {
            return obj.owner === task.getName();
        });
        return taskrunObject.map<TektonNode>((value) => {
            return new TektonNodeImpl(task, value.name, ContextType.TASKRUN, this, TreeItemCollapsibleState.None, value.creationTime, value.state);
        }).sort(compareTime);
    }

    async getTaskRuns(pipelinerun: TektonNode): Promise<TektonNode[]> {
        let taskruns: TektonNode[] = await this._getTaskRuns(pipelinerun);
        if (!taskruns) {
            return null;
        }
        else {
            if (!this.cache.has(pipelinerun)) {
                this.cache.set(pipelinerun, await this._getTaskRuns(pipelinerun));
            }
        }
        return this.cache.get(pipelinerun);
    }

    async _getTaskRuns(pipelinerun: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listTaskRuns());
        if (result.stderr) {
            console.log(result + " Std.err when processing pipelines");
            return [new TektonNodeImpl(pipelinerun, result.stderr, ContextType.TASKRUN, this, TreeItemCollapsibleState.Expanded)];
        }
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
        }
        const taskrunObject = data.map(value => ({ name: value.metadata.name, owner: value.metadata.ownerReferences ? value.metadata.ownerReferences[0].name : "", creationTime: value.metadata.creationTimestamp, state: value.status ? value.status.conditions[0].status : "" })).filter(function (obj) {
            return obj.owner === pipelinerun.getName();
        });
        return taskrunObject.map<TektonNode>((value) => {
            return new TektonNodeImpl(pipelinerun, value.name, ContextType.TASKRUN, this, TreeItemCollapsibleState.None, value.creationTime, value.state);
        }).sort(compareTime);
    }

    async getTasksWithTkn(task: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        const result: cliInstance.CliExitData = await this.execute(Command.listTasks());
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
        let data: any[] = [];
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

     async getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]> {
        return (await this._getPipelineResources(pipelineResources));
    }

    public async _getPipelineResources(pipelineResources: TektonNode): Promise<TektonNode[]> {
        let pipelines: TektonNode[] = await this.getPipelineResourcesWithTkn(pipelineResources);
        if (pipelines.length === 0) {
            console.log("No pipelines detected");
        }
        return pipelines;
    }
    private async getPipelineResourcesWithTkn(pipelineResource: TektonNode): Promise<TektonNode[]> {
        let data: any[] = [];
        const result: cliInstance.CliExitData = await this.execute(Command.listPipelineResources(), process.cwd(), false);
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

    public async _getTasks(task: TektonNode): Promise<TektonNode[]> {
        let tasks: TektonNode[] = await this.getTasksWithTkn(task);
        if (tasks.length === 0) {
            console.log("No tasks detected");
        }
        return tasks;
    }

    async getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        return (await this._getClusterTasks(clustertask));
    }

    async _getClusterTasks(clustertask: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listClusterTasks("default"));
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {

        }
        let tasks: string[] = data.map((value) => value.metadata.name);
        tasks = [...new Set(tasks)];
        return tasks.map<TektonNode>((value) => new TektonNodeImpl(clustertask, value, ContextType.CLUSTERTASK, this, TreeItemCollapsibleState.Collapsed)).sort(compareNodes);
    }

    async startPipeline(pipeline: StartPipelineObject): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.startPipeline(pipeline));
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
    async restartPipeline(pipeline: TektonNode): Promise<TektonNode[]> {
        await this.executeInTerminal(Command.restartPipeline(pipeline.getName()));
        return (await this.getPipelineChildren(pipeline));
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

    clearCache() {
        this.cache.clear();
    }
}
