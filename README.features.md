
### Tekton Pipelines Tutorial

To get started with Tekton and learn how to create and run a simple pipeline for building and deploying containerized app on Kubernetes/OpenShift, you can follow one of these tutorials:

* [Tekton Pipelines Tutorial](https://github.com/tektoncd/pipeline/blob/master/docs/tutorial.md)
* [OpenShift Pipelines Tutorial](https://github.com/openshift/pipelines-tutorial)

### TektonHub

   * TektonHub Integration:

      <div><img src="images/gif-tekton/tekton-hub.gif" /></div>

   * Install Task from TektonHub as ClusterTask:

      <div><img src="images/gif-tekton/tekton-hub-cluster.gif" /></div>


### Wizard for Pipeline Start

   * Start Pipeline:

      <div><img src="images/gif-tekton/start-pipeline.gif" /></div>

   * Pipeline with Workspace:

      <div><img src="images/gif-tekton/start-workspaces.gif" /></div>

   * Create new PVC:

      <div><img src="images/gif-tekton/create-workspace-pvc.gif" /></div>

### Show Tekton TaskRun/PipelineRun Logs in Editor

<div><img src="images/gif-tekton/show-logs-in-editor.gif" /></div>

### Tekton variables code completion

<div><img src="images/gif-tekton/code-completion.gif" /></div>

### Add Trigger support

<div><img src="images/gif-tekton/add-trigger.gif" /></div>

### Restart Pipeline with previous PipelineRun content

<div><img src="images/gif-tekton/restart-pipeline.gif" /></div>

### Deploy resource on save
>Note: This is experimental feature, you need to enable it in VSCode Setting Preferences

<div><img src="images/gif-tekton/deploy-resource.gif" /></div>

### 'Go to Definition' for Tekton Pipeline yaml

<div><img src="images/gif-tekton/go-to-defination.gif" /></div>

### Tekton tree auto refresh and open resource from an inline command

<div><img src="images/gif-tekton/auto-refresh.gif" /></div>

### PipelineRun Preview

<div><img src="images/gif-tekton/pipeline-diagram.gif" /></div>

### Setup OpenShift/Kubernetes Cluster to use with the Extension

To use the extension, developers can deploy Tekton Pipelines into [Red Hat OpenShift Local](https://developers.redhat.com/products/openshift-local/overview) or a `minikube` instance.

#### Red Hat OpenShift Local

- Red Hat OpenShift Local is the quickest way to get started building OpenShift clusters. It is designed to run on a local computer to simplify setup and testing, and to emulate the cloud development environment locally with all of the tools needed to develop container-based applications. Follow [this documentation](https://access.redhat.com/documentation/en-us/red_hat_openshift_local) to get it up and running. After cluster is started follow [these steps](https://github.com/openshift/pipelines-tutorial/#install-openshift-pipelines) to deploy OpenShift Pipelines into an OpenShift cluster.

#### minikube

- For detailed analysis of how to setup Tekton Pipelines into minikube instance, please follow the [instructions/tutorial](https://github.com/tektoncd/pipeline#want-to-start-using-pipelines).
