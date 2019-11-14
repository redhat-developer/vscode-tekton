# Visual Studio Code Tekton Pipelines Extension  <img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/tekton.png" alt="tekton" width="50"/>

| System | Status |
| - | - |
| Build ([master](https://github.com/redhat-developer/vscode-tekton/tree/master) branch) | [![Build Status](https://dev.azure.com/redhat-developer/vscode-tekton/_apis/build/status/redhat-developer.vscode-tekton?branchName=master)](https://dev.azure.com/redhat-developer/vscode-tekton/_build?definitionId=3&_a=summary) [![Build Status](https://travis-ci.com/redhat-developer/vscode-tekton.svg?branch=master)](https://travis-ci.com/redhat-developer/vscode-tekton) [![Unit Tests Code Coverage](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master/graph/badge.svg)](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master/graph/badge.svg) [![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://github.com/redhat-developer/vscode-openshift-tools/blob/master/README.md)|
| [Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines) | [![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-tekton-pipelines.svg)](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines)

## Overview

A Visual Studio Code extension for interacting with Tekton Pipelines.

- Uses `tkn` CLI commands to interact with Tekton Pipelines
- Provides snippets for creating Pipeline Resources


### Setup kubernetes cluster to use with extension

To use the extension, developers can deploy Tekton Pipelines into a minikube instance or use [Red Hat CodeReady Containters](https://developers.redhat.com/products/codeready-containers).

#### Red Hat CodeReady Containers

Red Hat CodeReady Containers is a simplest way to start OpenShift Cluster on your laptop in a matter of minutes, follow [this documentation](https://code-ready.github.io/crc/) to get it up and running. After cluster is started follow [this steps](https://github.com/openshift/pipelines-tutorial/#install-openshift-pipelines) to deploy OpenShift Pipelines into a OpenShift cluster.

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

<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/pipe.png" width="15" height="15" /><span style="margin: 20px">Pipeline Node</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/task.png" width="15" height="15" /><span style="margin: 20px">Task Node</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/clustertask.png" width="15" height="15" /><span style="margin: 20px">ClusterTask Node</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/pipe.png" width="15" height="15" /><span style="margin: 20px">PipelineResource Node</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/running.png" width="15" height="15" /><span style="margin: 20px">PipelineRun/TaskRun Running</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/success.png" width="15" height="15" /><span style="margin: 20px">PipelineRun/TaskRun Successful Run</span></div>
<div><img src="https://raw.githubusercontent.com/redhat-developer/vscode-tekton/master/images/failed.png" width="15" height="15" /><span style="margin: 20px">PipelineRun/TaskRun Failed Run</span></div>


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

## WARNING: Nightly builds are by definition unstable. Install at you own risk.

Nightly build bits are published once in 24 hours and available from this [location](https://download.jboss.org/jbosstools/adapters/snapshots/vscode-tekton/?C=M;O=D) with most recent build is on top of the list. 
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

License
=======
MIT, See [LICENSE](LICENSE) for more information.
