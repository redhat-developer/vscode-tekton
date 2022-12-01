# Tekton Pipelines Extension Tutorial

This tutorial goal is to let you go through all the steps in original
[OpenShift Pipelines Tutorial](https://github.com/openshift/pipelines-tutorial/#install-openshift-pipelines)
without leaving Visual Studio Code window.

## Requirements

The tutorial assumes you have:
* An access to remote or local OpenShift cluster.
* Tekton deployed on your OpenShift cluster.
* Visual Studio Code installed.

## Configure Visual Studio Code and Install Required Extensions

For this tutorial you need to install required extensions from Visual Studio Code Marketplace:
* Tekton Pipelines - https://marketplace.visualstudio.com/items?itemName=redhat.vscode-tekton-pipelines
* OpenShift Connector - https://marketplace.visualstudio.com/items?itemName=redhat.vscode-openshift-connector

## OpenShift and Tekton Task Catalogs Git Repositories

Tekton Pipeline extension does not provide integration with task catalogs yet. To create tekton tasks used
in this tutorial you are going to use two github repositories:
* Tekton Tasks catalog - https://github.com/tektoncd/catalog
* OpenShift Pipelines catalog - https://github.com/openshift/pipelines-catalog

### Pipelines Tutorial Git Repository

You will use resources from original tutorial repository to deploy your application on the cluster:
* OpenShift Pipeline Tutorial - https://github.com/openshift/pipelines-tutorial
* Tekton Pipelines Tutorial - https://github.com/tektoncd/pipeline/blob/master/docs/tutorial.md

## Demo Video

[![](http://img.youtube.com/vi/gte70CuQXbM/0.jpg)](http://www.youtube.com/watch?v=gte70CuQXbM "")

