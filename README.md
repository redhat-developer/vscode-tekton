# Visual Studio Code Tekton Pipelines Extension  <img src="images/tekton.png" alt="tekton" width="50"/>

[![Build Status](https://travis-ci.org/onyiny-ang/vscode-tekton.svg?branch=master)](https://travis-ci.org/onyiny-ang/vscode-tekton)
[![Build Status](https://travis-ci.org/redhat-developer/vscode-tekton.svg?branch=master)](https://travis-ci.org/redhat-developer/vscode-tekton)
[![Unit Tests Code Coverage](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master/graph/badge.svg)](https://codecov.io/gh/redhat-developer/vscode-tekton/branch/master/graph/badge.svg)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://github.com/redhat-developer/vscode-tekton/blob/master/README.md)
[![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-tekton-pipelines.svg)](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines)

## Overview

A Visual Studio Code extension for interacting with Tekton Pipelines.

To use the extension, developers can deploy Tekton Pipelines into a minikube instance (minishift / CDK has not been tested thoroughly but [feedback](issues) would be appreciated!). Currently all clusters are supported, but with some limitations for OpenShift Online Pro where additional storage might be required to create more than two components.

For detail analysis of how to setup and run local OpenShift Cluster using minishift, please follow this wiki.


### Commands and features

### General Commands

### Dependencies

#### CLI Tools

This extension uses the [Tekton CLI](https://github.com/tektoncd/cli):  `tkn`

#### Extensions

This extension depends on Kubernetes Extension form Microsoft which is going to be installed automatically along with the Tekton Pipelines Extension. The below image demonstrates the Kubernetes Extension public API displaying Tekton specific resources: ClusterTasks, Tasks, Pipelines, Pipeline Resources, Pipelineruns, Taskruns in the Kubernetes Clusters View.

### Release notes
see the [change log](CHANGELOG.md).

Contributing
============
This is an open source project open to anyone. This project welcomes contributions and suggestions!

For information on getting started, refer to the [CONTRIBUTING instructions](CONTRIBUTING.md).

Download the most recent `tekton-pipelines-<version>.vsix` file and install it by following the instructions [here](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

Feedback & Questions
====================
If you discover an issue please file a bug and we will fix it as soon as possible.
* File a bug in [GitHub Issues](https://github.com/redhat-developer/vscode-tekton/issues).



