# Tekton Pipelines Extension Tutorial

This tutorial goal is to let you go through all the steps in original
[OpenShift Pipelines Tutorial](https://github.com/openshift/pipelines-tutorial/#install-openshift-pipelines)
without leaving Visual Studio Code window. 

## Assumptions

This tutorial assumes:
* You have an access to remote or local OpenShift cluster
* Your cluster has tekton deployed 
* You have Visual Studio Code installed

## Configure Visual Studio Code

For this tutorial you need to install required extensions from Visual Studio Code marketplace and clone
three github repositories with tekton task definitions and resources for example project. 

### Install Required Extensions

To go throuhg tutorial you need to instll two extensions from Visual Studio marketplace:
* Tekton Pipelines
* OpenSift connector

### Clone OpenShift and Tekton Task Catalogs Git Repositories

Tektnon Pipeline extension does not provide integration with task catalogs yet. To create tekton tasks used
in this tutorial you need to clone two github repositories into VSCode workspace:
* Tekton Tasks catalog - https://github.com/tektoncd/catalog
* OpenShift Pipelines catalog - https://github.com/openshift/pipelines-catalog

You are goint to use task definitiions form those catalogs later when you create your firs tekton pipeline.

### Clone Pipelines Tutorial Git Repository

We are using resources trom original tutorial to deploy your application on the cluster, so we need it to 
be cloned to VSCode workspace as well:
* Pipeline Tutorial 


