import * as cliInstance from './cli';
import { ProviderResult, TreeItemCollapsibleState, window, Terminal, Uri, commands, QuickPickItem, workspace } from 'vscode';
import { WindowUtil } from './util/windowUtils';
import { CliExitData } from './cli';
import * as path from 'path';
import { ToolsConfig } from './tools';
import format =  require('string-format');
import { PipelineExplorer } from './explorer';
import { wait } from './util/async';
import { statSync } from 'fs';
import bs = require('binary-search');
import { Platform } from './util/platform';
import { pipeline } from 'stream';

export interface TektonNode extends QuickPickItem {
    contextValue: string;
    comptype ?: string;
    getChildren(): ProviderResult<TektonNode[]>;
    getParent(): TektonNode;
    getName(): string;
}

export enum ContextType {
    TASK = 'task',
    TASKRUN = 'taskRun',
    PIPELINE = 'pipeline',
    PIPELINERUN = 'pipelineRun',
    CLUSTERTASK = 'clusterTask'
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
        const v = workspace.getConfiguration('tektonPipelines').get('outputVerbosityLevel');
        const command = fn!.apply(this, args);
        return command + (v > 0 ? ` -v ${v}` : '');
	};
}

export class Command {
    static startPipeline(name: string) {
        return 'tkn pipeline start ${name}';
    }
    static listPipelines() {
        return 'tkn pipeline list';
    }
    static describePipelines() {
        return 'tkn pipeline describe';
    }
    static listPipelineRuns() {
        return 'tkn pipelinerun list';
    }
    static describePipelineRuns(name: string) {
        return 'tkn pipelinerun describe ${name}';
    }
    static showPipelineRunLogs(name: string) {
        return 'tkn pipelinerun logs ${name}';
    }
    static listTasks(name: string) {
        return 'tkn task list ${name}';
    }
    static listTaskRuns(name: string) {
        return 'tkn taskrun list ${name}';
    }
/*     static describeTaskRuns(name: string) {
        return 'tkn taskrun list ${name}';
    } */
    static showTaskRunLogs(name: string) {
        return 'tkn taskrun logs ${name}';
    }
    static printTknVersion() {
        return 'tkn version';
    }
    //TODO: Watch components as per odo so that we can reconcile pipeline view properly
    //TODO: Create and delete pipelines
    //TODO: Should Clustertasks also be found by tkn?
}

export class TektonNodeImpl implements TektonNode {
    private readonly CONTEXT_DATA = {
        pipeline: {
            icon: 'pipe.png',
            tooltip: 'Application: {label}',
            getChildren: () => this.tkn.getPipelines()
        },
        pipelineRun: {
            icon: 'pipe.png',
            tooltip: 'Component: {label}',
            getChildren: () => this.tkn.getPipelineRuns(this)
        },
        task: {
            icon: 'task.png',
            tooltip: 'Service: {label}',
            getChildren: () => []
        },
        taskRun: {
            icon: 'task.png',
            tooltip: 'Storage: {label}',
            getChildren: () => []
        },
        clusterTask: {
            icon: 'clustertask.png',
            tooltip: 'Cannot connect to the cluster',
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
        return Uri.file(path.join(__dirname, "../../images/", this.CONTEXT_DATA[this.contextValue].icon));
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
    startPipeline(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelines(): Promise<TektonNode[]>;
    describePipeline(pipeline: TektonNode): Promise<TektonNode[]>;
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]>;
    describePipelineRun(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getPipelineRunLogs(pipelineRun: TektonNode): Promise<TektonNode[]>;
    getTasks(task: TektonNode): Promise<TektonNode[]>;
//    describeTask(task: TektonNode): Promise<TektonNode[]>;
    getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    getTaskRunLogs(taskRun: TektonNode): Promise<TektonNode[]>;
//    describeTaskRuns(taskRun: TektonNode): Promise<TektonNode[]>;
    getComponentTypeVersions(componentName: string): Promise<string[]>;
    getClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]>;
    describeClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]>;
    execute(command: string, cwd?: string, fail?: boolean): Promise<CliExitData>;
    executeInTerminal(command: string, cwd?: string): void;
    clearCache?(): void;
}

export function getInstance(): Tkn {
    return TknImpl.Instance;
}

function compareNodes(a, b): number {
    if (!a.contextValue) return -1;
    if (!b.contextValue) return 1;
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

    async getPipelines(): Promise<TektonNode[]> {
        if (!this.cache.has(this.ROOT)) {
            this.cache.set(this.ROOT, await this._getPipelines());
        }
        return this.cache.get(this.ROOT);
    }

    public async _getPipelines(): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listPipelines());
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
            // show no apps if output is not correct json
            // see https://github.com/redhat-developer/odo/issues/1327
        }
        let apps: string[] = data.map((value) => value.metadata.name);
        apps = [...new Set(apps)]; // remove duplicates form array
        return apps.map<TektonNode>((value) => new TektonNodeImpl(project, value, ContextType.PIPELINE, TknImpl.instance)).sort(compareNodes);
    }
    getPipelineRuns(pipelineRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    getTasks(task: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    getTaskRuns(taskRun: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
    }
    getComponentTypeVersions(componentName: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getClusterTasks(clusterTask: TektonNode): Promise<TektonNode[]> {
        throw new Error("Method not implemented.");
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


    public async getApplicationChildren(application: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(application)) {
            this.cache.set(application,  await this._getApplicationChildren(application));
        }
        return this.cache.get(application);
    }

    async _getApplicationChildren(application: TektonNode): Promise<TektonNode[]> {
        return [... await this._getComponents(application), ... await this._getServices(application)].sort(compareNodes);
    }

    async getComponents(application: TektonNode): Promise<TektonNode[]> {
        return (await this.getApplicationChildren(application)).filter((value) => value.contextValue === ContextType.COMPONENT);
    }

    public async _getComponents(application: TektonNode): Promise<TektonNode[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listComponents(application.getParent().getName(), application.getName()), Platform.getUserHomePath());
        let data: any[] = [];
        try {
            data = JSON.parse(result.stdout).items;
        } catch (ignore) {
            // show no apps if output is not correct json
            // see https://github.com/openshift/odo/issues/1521
        }
        const componentObject = data.map(value => ({ name: value.metadata.name, source: value.spec.source }));

        return componentObject.map<TektonNode>((value) => {
            let compSource: string = '';
            try {
                if (value.source.startsWith('https://')) {
                    compSource = 'git';
                } else if (statSync(Uri.parse(value.source).fsPath).isFile()) {
                    compSource = 'binary';
                } else if (statSync(Uri.parse(value.source).fsPath).isDirectory()) {
                    compSource = 'folder';
                }
            } catch (ignore) {
                // treat component as local in case of error when calling statSync
                // for not existing file or folder
                compSource = 'folder';
            }
            return new TektonNodeImpl(application, value.name, ContextType.COMPONENT, this, TreeItemCollapsibleState.Collapsed, compSource);
        });
    }

    public async getComponentTypes(): Promise<string[]> {
        const result: cliInstance.CliExitData = await this.execute(Command.listCatalogComponents());
        return result.stdout.trim().split('\n').slice(1).map((value) => value.replace(/\*/g, '').trim().replace(/\s{1,}/g, '|').split('|')[0]);
    }

    public async getComponentChildren(component: TektonNode): Promise<TektonNode[]> {
        if (!this.cache.has(component)) {
            this.cache.set(component, await this._getComponentChildren(component));
        }
        return this.cache.get(component);
    }

    async _getComponentChildren(component: TektonNode): Promise<TektonNode[]> {
        return [... await this._getStorageNames(component), ... await this._getRoutes(component)].sort(compareNodes);
    }

    public async executeInTerminal(command: string, cwd: string = process.cwd(), name: string = 'Tekton') {
        const cmd = command.split(' ')[0];
        let toolLocation = await ToolsConfig.detectOrDownload(cmd);
        if (toolLocation) {
            toolLocation = path.dirname(toolLocation);
        }
        const terminal: Terminal = WindowUtil.createTerminal(name, cwd, toolLocation);
        terminal.sendText(command, true);
        terminal.show();
    }

    public async execute(command: string, cwd?: string, fail: boolean = true): Promise<CliExitData> {
        const cmd = command.split(' ')[0];
        const toolLocation = await ToolsConfig.detectOrDownload(cmd);
        return OdoImpl.cli.execute(
            toolLocation ? command.replace(cmd, `"${toolLocation}"`).replace(new RegExp(`&& ${cmd}`, 'g'), `&& "${toolLocation}"`) : command,
            cwd ? {cwd} : { }
        ).then(async (result) => result.error && fail ?  Promise.reject(result.error) : result).catch((err) => fail ? Promise.reject(err) : Promise.resolve({error: null, stdout: '', stderr: ''}));
    }

    clearCache() {
        this.cache.clear();
    }
}