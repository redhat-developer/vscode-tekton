# Tekton Pipelines Extension  <img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/tekton.png" alt="tekton" width="50"/>

| System | Status |
| - | - |
| Build ([master](https://github.com/redhat-developer/vscode-tekton/tree/master) branch) | ![build](https://github.com/redhat-developer/vscode-tekton/workflows/CI/badge.svg) [![Unit Tests Code Coverage](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master/graph/badge.svg)](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master) [![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://github.com/redhat-developer/vscode-tekton/blob/master/LICENSE)|
| [Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines) | [![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-tekton-pipelines.svg)](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines)

## Overview

### Tekton version

This extension designed to work with Tekton Pipelines 0.11+

### Tekton API version

We support `v1beta1` API. Previous version `v1alpha1` may work, but we not guarantee that all features will work properly. If you have `v1alpha1` pipelines/tasks please use [migrating document](https://github.com/tektoncd/pipeline/blob/master/docs/migrating-v1alpha1-to-v1beta1.md) to migrate to `v1beta1`.

A Visual Studio Code extension for interacting with Tekton Pipelines.
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/demo_0.2.0.gif" width="800" height="500" /></div>

## New and Noteworthy

### Install Task from TektonHub as ClusterTask
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/install_task_as_clustertask_0.9.0.gif" width="800" height="600" /></div>

### Tekton variables code completion
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/tekton_variables_completion_0.9.0.gif" width="800" height="600" /></div>

### TektonHub integration
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/tekton_hub_0.8.0.gif" width="1080" height="675" /></div>

### Create new pvc support

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/create_pvc.gif" width="800" height="450" /></div>

### Add Trigger support

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/add_trigger.gif" width="800" height="450" /></div>

### Restart pipeline with previous pipelineRun content

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/restart_pipeline_run.gif" width="800" height="450" /></div>

### New Wizard for Pipeline Start

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/pipeline_wizard_0.4.0.gif" width="800" height="450" /></div>

Pipeline with Workspace:
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/pipeline_wizard_ws_0.4.0.gif" width="800" height="450" /></div>

### Deploy resource on save
>Note: This is experimental feature, you need to enable it in preferences

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/deploy_on_save_0.2.0.gif" width="800" height="500" /></div>

### 'Go to Definition' for Tekton Pipeline yaml

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/go_to_definition_0.1.0.gif" width="800" height="651" /></div>

### Workspaces support

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/pipeline_start_with_ws_0.1.0.gif" width="800" height="450" /></div>


### Tekton tree auto refresh and open resource from inline command

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/tree_refresh_0.0.8.gif" width="800" height="450" /></div>

### PipelineRun preview
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/new/pipeline_run_preview_0.0.7.gif" width="800" height="450" /></div>

### Provides editing support for Pipeline yaml
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/editing-demo.gif" width="800" height="450" /></div>


### Setup kubernetes cluster to use with extension

To use the extension, developers can deploy Tekton Pipelines into a minikube instance or use [Red Hat CodeReady Containers](https://developers.redhat.com/products/codeready-containers).

#### Red Hat CodeReady Containers

Red Hat CodeReady Containers is a simple way to start OpenShift Cluster on your laptop in a matter of minutes, follow [this documentation](https://code-ready.github.io/crc/) to get it up and running. After cluster is started follow [this steps](https://github.com/openshift/pipelines-tutorial/#install-openshift-pipelines) to deploy OpenShift Pipelines into a OpenShift cluster.

#### minikube

For detailed analysis of how to setup Tekton Pipelines into minikube instance, please follow the [instructions/tutorial](https://github.com/tektoncd/pipeline#want-to-start-using-pipelines).

### Tutorial

Follow Tekton Pipeline Extension [tutorial](TUTORIAL.md) inspired by [original tutorial](https://github.com/openshift/pipelines-tutorial) that uses OpenShift Developer Console, `tkn` and `oc` command line tools.

### Commands and features

Development of the Tekton Pipelines Extension is largely following development of the [`tkn` CLI](https://github.com/tektoncd/cli) as well as [Tekton Pipelines](https://github.com/tektoncd/pipeline) which are both under active development and potentially subject to drastic changes. Please don't hesitate to open an [issue](issues) if you find a bug or something breaks unexpectedly. Pull Requests are always welcome--see the [CONTRIBUTING](CONTRIBUTING.md) section for details.

`tekton-pipelines` supports a number of commands & actions for interacting with Tekton Pipelines; these are accessible via the command menu (`Cmd+Shift+P` <kbd>⌘⇧P</kbd> on macOS or `Ctrl+Shift+P` <kbd>⌃⇧P</kbd> on Windows and Linux) and may be bound to keys in the normal way.

* `Tekton: About` - Provides the `tkn` tool version.
* `Tekton: Show Output Channel` - Shows commands running under the hood and their output.
* `Tekton: Refresh View` - Refreshes the Tekton Pipeline View.

#### Actions available for a Tekton Pipeline/Task/ClusterTask

   * `Pipeline -> Start` - Start a Pipeline with user indicated resources, parameters and service account.
   * `Pipeline -> Restart` - Restart the last Pipeline run.
   * `Pipeline/Task/ClusterTask -> List` - List all Pipelines in a Cluster.
   * `Pipeline -> Describe` - Prints the JSON of a selected Pipeline.
   * `Pipeline/Task/ClusterTask -> Delete` - Delete the selected Pipeline.

#### Actions available for a Tekton PipelineRun

   * `PipelineRun/TaskRun -> List` - List all PipelineRuns/TaskRuns in a Pipeline/Task
   * `PipelineRun/TaskRun -> Describe` - Describe the selected PipelineRun/TaskRun
   * `PipelineRun/TaskRun -> Logs` - Print Logs from the selected PipelineRun/TaskRun
   * `PipelineRun/TaskRun -> Delete` - Delete the selected PipelineRun/TaskRun
   * `PipelineRun -> Cancel` - Cancel the selected PipelineRun


#### Icons Representation

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/PL.png" width="15" height="15" /><span style="margin: 20px">Pipeline Node</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/T.png" width="15" height="15" /><span style="margin: 20px">Task Node</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/CT.png" width="15" height="15" /><span style="margin: 20px">ClusterTask Node</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/PLR.png" width="15" height="15" /><span style="margin: 20px">PipelineResource Node</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/running.gif" width="15" height="15" /><span style="margin: 20px">PipelineRun/TaskRun Running</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/error/PLR.png" width="15" height="15" /><span style="margin: 20px">PipelineRun Failed</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/error/TR.png" width="15" height="15" /><span style="margin: 20px">TaskRun Failed</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/error/C.png" width="15" height="15" /><span style="margin: 20px">Condition Failed</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/pending/PLR.png" width="15" height="15" /><span style="margin: 20px">PipelineRun Pending</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/pending/TR.png" width="15" height="15" /><span style="margin: 20px">TaskRun Pending</span></div>
<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/tree/pending/C.png" width="15" height="15" /><span style="margin: 20px">Condition Pending</span></div>


### Extension Configuration Settings
   * `Tekton Pipelines: Show Channel On Output` - Show Tekton Pipelines output channel when new text added to output stream
   * `Tekton Pipelines: Output verbosity level` - Output verbosity level (value between 0 and 9) for Tekton Pipeline Start, Push and Watch commands in output channel and integrated terminal.

### Dependencies

#### CLI Tools

This extension uses the [Tekton CLI](https://github.com/tektoncd/cli):  `tkn`

#### Extensions

This extension depends on Kubernetes Extension form Microsoft which is going to be installed automatically along with the Tekton Pipelines Extension. The image belows demonstrates the Kubernetes Extension public API displaying Tekton specific resources: ClusterTasks, Tasks, Pipelines, Pipeline Resources, Pipelineruns, Taskruns in the Kubernetes Clusters View.

## Release notes

See the [change log](CHANGELOG.md).

Nightly builds
==============

## WARNING: Nightly builds are by definition unstable. Install at your own risk.

Nightly builds are published every 24 hours and available from this [location](https://download.jboss.org/jbosstools/adapters/snapshots/vscode-tekton/?C=M;O=D) with most recent build is on top of the list. 
To install nightly build, download latest extension `.vsix` package and follow the steps on image below.

<div><img src="https://raw.githubusercontent.com/wiki/redhat-developer/vscode-tekton/images/readme/install-vsix.gif" width="708" height="500" /></div>


Contributing
============
This is an open source project open to anyone. This project welcomes contributions and suggestions!

For information on getting started, refer to the [CONTRIBUTING instructions](CONTRIBUTING.md).

Download the most recent `tekton-pipelines-<version>.vsix` file and install it by following the instructions [here](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

Feedback & Questions
====================
If you discover an issue please file a bug and we will fix it as soon as possible.
* File a bug in [GitHub Issues](https://github.com/redhat-developer/vscode-tekton/issues).
* Or contact us in [Tekton Slack](https://github.com/tektoncd/community/blob/master/contact.md#slack) `#ide-integration` channel

License
=======
MIT, See [LICENSE](LICENSE) for more information.
