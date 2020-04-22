# Change Log

## 0.0.8 (April 22, 2020)

This release brings to you:

* [#181](https://github.com/redhat-developer/vscode-tekton/issues/181)Show conditional tasks in the pipeline and pipelinerun diagrams
* [#197](https://github.com/redhat-developer/vscode-tekton/issues/197)Add PipelineRun in the tree as a root node
* [#198](https://github.com/redhat-developer/vscode-tekton/issues/198)Add TaskRuns in the tree as a root node
* [#241](https://github.com/redhat-developer/vscode-tekton/pull/241)Single click on icon will open yaml in editor
* [#183](https://github.com/redhat-developer/vscode-tekton/issues/183)Add support for v1beta1 API
* [#176](https://github.com/redhat-developer/vscode-tekton/issues/176)Update snippet apiversions
* [#240](https://github.com/redhat-developer/vscode-tekton/issues/240)Revisit pipeline tree load
* [#239](https://github.com/redhat-developer/vscode-tekton/issues/239)Improve tekton tree refresh
* [#251](https://github.com/redhat-developer/vscode-tekton/issues/251)Open PipelineRun and TaskRun as readonly
* Bugfixes or minor issues:
  * [#217](https://github.com/redhat-developer/vscode-tekton/issues/217)Error when starting pipeline with no spec/resource section
  * [#2](https://github.com/redhat-developer/vscode-tekton/issues/2)Display build logs from cluster view
  * [#184](https://github.com/redhat-developer/vscode-tekton/issues/184)Add snippets for trigger types
  * [#185](https://github.com/redhat-developer/vscode-tekton/issues/185)Add snippets for conditions
  * [#225](https://github.com/redhat-developer/vscode-tekton/issues/225)Snippets ClusterTask wrong
  * [#246](https://github.com/redhat-developer/vscode-tekton/pull/246)Warning message if cluster is down

## 0.0.7 (April 03, 2020)

This release brings to you:

* [#171](https://github.com/redhat-developer/vscode-tekton/issues/171) Show selected resources as a tree
* [#182](https://github.com/redhat-developer/vscode-tekton/issues/182) Add delete action to trigger types
* [#174](https://github.com/redhat-developer/vscode-tekton/issues/174) Add and remove resources to the selected Tekton resource window
* [#149](https://github.com/redhat-developer/vscode-tekton/issues/149) Add support for conditions
* [#109](https://github.com/redhat-developer/vscode-tekton/issues/109) Refresh tekton tree automatically
* [#164](https://github.com/redhat-developer/vscode-tekton/issues/164) Refresh tree when resource delete is successfull
* [#175](https://github.com/redhat-developer/vscode-tekton/issues/175) Diagram preview for PipelineRuns
* Bugfixes for minor issues:
  * [#212](https://github.com/redhat-developer/vscode-tekton/pull/212) Fix bug in task.yaml present in rawsnippets
  * [#229](https://github.com/redhat-developer/vscode-tekton/issues/229) Tekton Task snippet contains a syntax error for args

## 0.0.6 (March 18, 2020)

This release brings to you:

* [#151](https://github.com/redhat-developer/vscode-tekton/issues/151) Add Tekton to activity bar
* [#150](https://github.com/redhat-developer/vscode-tekton/issues/150) Add pipeline diagram preview
* [#165](https://github.com/redhat-developer/vscode-tekton/issues/165) Update tkn version to 0.8
* [#147](https://github.com/redhat-developer/vscode-tekton/issues/147) Add support for trigger resource types
* [#148](https://github.com/redhat-developer/vscode-tekton/issues/148) Allow editing trigger resources
* [#191](https://github.com/redhat-developer/vscode-tekton/pull/191) Added new icon in tree view resource
* Bugfixes for minor issues:
  * [#167](https://github.com/redhat-developer/vscode-tekton/issues/167) oc is required for certain operations
  * [#172](https://github.com/redhat-developer/vscode-tekton/issues/172) Add more description tooltip to select icon
  * [#170](https://github.com/redhat-developer/vscode-tekton/issues/170) YAML validation complains about workspace
  * [#154](https://github.com/redhat-developer/vscode-tekton/issues/154) New minor version of tkn should work

## 0.0.5 (February 21, 2020)

This release brings to you:

* [#141](https://github.com/redhat-developer/vscode-tekton/issues/141) Update tkn cli version to `0.7.1`
* [#111](https://github.com/redhat-developer/vscode-tekton/issues/111) Open YAML on click in Tekton Pipelines window
* [#152](https://github.com/redhat-developer/vscode-tekton/issues/152) Add filtering in the Tekton view container
* [#55](https://github.com/redhat-developer/vscode-tekton/issues/55) Create 'New Pipeline Resource' command
* Bugfixes for minor issues:
  * [#155](https://github.com/redhat-developer/vscode-tekton/pull/155) Fix typos & wording

## 0.0.4 (February 11, 2020)

This release brings to you:

* [#121](https://github.com/redhat-developer/vscode-tekton/issues/121)Allow to use Tekton Catalog for creating and editing tekton related resources
* [#108](https://github.com/redhat-developer/vscode-tekton/issues/108) Change color for "running" pipelineruns and taskruns
* [#133](https://github.com/redhat-developer/vscode-tekton/issues/133) Show complete PipelineRun names 
* Bugfixes for minor issues:
  * [#134](https://github.com/redhat-developer/vscode-tekton/issues/134) Update info message to refect pipeline start

## 0.0.3 (January 16, 2020)

This is bug fix release:
* Fixed check Tekton CLI when CLI has 'v' prefix in version
* [#130](https://github.com/redhat-developer/vscode-tekton/issues/130) Update CLI not found error message

## 0.0.2 (January 15, 2020)

This release brings to you:

* [#99](https://github.com/redhat-developer/vscode-tekton/pull/99 ) 'Tekton: Follow Log' command for PipelineRuns and TaskRuns #99
* [#92](https://github.com/redhat-developer/vscode-tekton/issues/92) `Tekton: Delete` commands should show confirmation info message and run with `-f` without terminal
* Update tkn version to 0.6
* [#116](https://github.com/redhat-developer/vscode-tekton/issues/116) Allow user to use higher version of tkn with warning.
* [#1](https://github.com/redhat-developer/vscode-tekton/issues/1) Fail gracefully if tekton APIs are not available
* [#79](https://github.com/redhat-developer/vscode-tekton/issues/79) Limit number of pipelineruns and taskruns shown in tree through extension preference
* Bugfixes for minor issues:
  - quickpick close when clicking anywhere else on desktop
  - [#90](https://github.com/redhat-developer/vscode-tekton/issues/90) Error: stdout maxBuffer lenght exceeded

## 0.0.1 (November 21, 2019)

- Initial release!
