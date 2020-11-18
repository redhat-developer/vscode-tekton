# Change Log

## 0.8.0 (November 18, 2020)

This release brings to you:

* [#433](https://github.com/redhat-developer/vscode-tekton/issues/433) Add service account to start and add trigger wizards
* [#418](https://github.com/redhat-developer/vscode-tekton/issues/418) Display pipelinerun failure reason
* [#404](https://github.com/redhat-developer/vscode-tekton/issues/404) Display expose url in tree view.
* [#346](https://github.com/redhat-developer/vscode-tekton/issues/346) Search tasks in Tekton Hub
* [#186](https://github.com/redhat-developer/vscode-tekton/issues/186) Install tasks from Tekton Hub


## 0.7.0 (October 28, 2020)

This release brings to you:

* [#362](https://github.com/redhat-developer/vscode-tekton/issues/362) Unique names for files from Open in Editor
* [#365](https://github.com/redhat-developer/vscode-tekton/issues/365) Auto refresh when file get created
* [#414](https://github.com/redhat-developer/vscode-tekton/issues/414) Assist creating PVC for workspaces
* [#416](https://github.com/redhat-developer/vscode-tekton/issues/416) Add 'when' to diagram
* [#427](https://github.com/redhat-developer/vscode-tekton/pull/427) Update schemas based on Tekton Pipeline 0.17.0
* [#430](https://github.com/redhat-developer/vscode-tekton/pull/430) Fix getName error
* [#436](https://github.com/redhat-developer/vscode-tekton/issues/436) Update tkn version to `0.13.1`
* [#438](https://github.com/redhat-developer/vscode-tekton/pull/438) Show create PVC UI if no PVC item present in dropdown.

## 0.6.0 (October 8, 2020)

This release brings to you:

* [#345](https://github.com/redhat-developer/vscode-tekton/issues/345) Support for "finally" tasks
* [#361](https://github.com/redhat-developer/vscode-tekton/issues/361) Array notation is not recognized by the pipeline diagram
* [#366](https://github.com/redhat-developer/vscode-tekton/issues/366) Display TaskRun names under Task and TaskRuns
* [#405](https://github.com/redhat-developer/vscode-tekton/issues/405) Error when clicking the Add Trigger command but triggers are not installed on cluster
* [#406](https://github.com/redhat-developer/vscode-tekton/issues/406) Error when creating trigger resources with newest Tekton Triggers
* [#407](https://github.com/redhat-developer/vscode-tekton/issues/407) Add workspace support in trigger.
* [#411](https://github.com/redhat-developer/vscode-tekton/issues/411) When clicking on TaskRuns tree view it throws an error.
* [#419](https://github.com/redhat-developer/vscode-tekton/issues/419) Add trigger action disabled when it shouldn't

## 0.5.0 (September 21, 2020)

This release brings to you:

* [#280](https://github.com/redhat-developer/vscode-tekton/issues/280) Start pipeline/Task from k8's tree
* [#347](https://github.com/redhat-developer/vscode-tekton/issues/347) Add trigger to pipeline
* [#348](https://github.com/redhat-developer/vscode-tekton/issues/348) Links to Tekton documentation
* [#351](https://github.com/redhat-developer/vscode-tekton/issues/351) Allow opening start pipeline wizard with params from previous pipelineRun
* [#363](https://github.com/redhat-developer/vscode-tekton/issues/363) Use default shell
* [#383](https://github.com/redhat-developer/vscode-tekton/pull/383) Disable button when input are empty
* [#385](https://github.com/redhat-developer/vscode-tekton/issues/385) Display Start as first action
* [#386](https://github.com/redhat-developer/vscode-tekton/issues/386) Default param values missing in start
* [#392](https://github.com/redhat-developer/vscode-tekton/pull/392) Update schemas to Pipeline 0.15.1
* [#398](https://github.com/redhat-developer/vscode-tekton/issues/398) Update tkn version to `0.12.1`

## 0.4.0 (August 7, 2020)

This release brings to you:

* [#309](https://github.com/redhat-developer/vscode-tekton/issues/309) Start task forces value for all parameters
* [#244](https://github.com/redhat-developer/vscode-tekton/issues/244) Add completion for 'conditionRef' in Pipeline conditions
* [#258](https://github.com/redhat-developer/vscode-tekton/issues/258) Provide JSON Scheme for all Tekton resources
* [#213](https://github.com/redhat-developer/vscode-tekton/issues/213) Delete multiple resources at once
* [#371](https://github.com/redhat-developer/vscode-tekton/issues/371) Add action to show pipelinerun diagram from the tree
* [#310](https://github.com/redhat-developer/vscode-tekton/issues/310) New Wizard for PipelineRun
* [#376](https://github.com/redhat-developer/vscode-tekton/issues/376) Update tkn version to `0.11.0`

## 0.3.0 (July 3, 2020)

This release brings to you:

* [#288](https://github.com/redhat-developer/vscode-tekton/issues/288) All command should be accessible from command palette
* [#311](https://github.com/redhat-developer/vscode-tekton/issues/311) Delete command for conditions
* [#331](https://github.com/redhat-developer/vscode-tekton/issues/331) Update tkn version to `0.10.0`
* [#296](https://github.com/redhat-developer/vscode-tekton/issues/296) Tekton.edit error when clicking on the "Open in Editor" icon
* Bugfixes or minor issues:
  * [#284](https://github.com/redhat-developer/vscode-tekton/issues/284) v1beta1 in Condition snippet but they are still in alpha
  * [#321](https://github.com/redhat-developer/vscode-tekton/issues/321) 'Open in Editor' works wrong for condition run

## 0.2.0 (June 1, 2020)

This release brings to you:

* [#91](https://github.com/redhat-developer/vscode-tekton/issues/91) "List Taskrun" menu on a pipeline should only list the pipeline's taskrun
* [#228](https://github.com/redhat-developer/vscode-tekton/issues/228) Add support for ClusterTriggerBinding resource.
* [#275](https://github.com/redhat-developer/vscode-tekton/issues/275) Simplify start pipeline wizard
* [#285](https://github.com/redhat-developer/vscode-tekton/pull/285) New implementation of FileSystemProvider for tekton resources
* [#250](https://github.com/redhat-developer/vscode-tekton/issues/250) Deploy Tekton resources on save
* [#292](https://github.com/redhat-developer/vscode-tekton/pull/292) Show condition run as child for taskrun
* [#252](https://github.com/redhat-developer/vscode-tekton/issues/252) Action to open Task from a TaskRun in the tree
* [#306](https://github.com/redhat-developer/vscode-tekton/issues/306) show open in editor option in condition.
* [#305](https://github.com/redhat-developer/vscode-tekton/issues/305) Rename Tekton Configuration tab to just tekton
* Bugfixes or minor issues:
  * [#295](https://github.com/redhat-developer/vscode-tekton/issues/295) startsWith throw an error of undefined
  * [#299](https://github.com/redhat-developer/vscode-tekton/pull/299) Fix issue for file name with space.
  * [#193](https://github.com/redhat-developer/vscode-tekton/issues/193) Failing PipelineRun with CouldnGetTask error are not shown
  * [#265](https://github.com/redhat-developer/vscode-tekton/issues/265) Label for pipeline preview doesn't show the full text.
  * [#308](https://github.com/redhat-developer/vscode-tekton/pull/308) Fix coverage banner link
  * [#304](https://github.com/redhat-developer/vscode-tekton/issues/304) Tekton Configuration is by settings.json

## 0.1.0 (May 13, 2020)

This release brings to you:

* [#260](https://github.com/redhat-developer/vscode-tekton/pull/260)Added missing node in kubernetes tree
* [#195](https://github.com/redhat-developer/vscode-tekton/issues/195)Sync pipeline preview with text editor
* [#266](https://github.com/redhat-developer/vscode-tekton/issues/266)Update Tkn cli version(`0.9.0`)
* [#189](https://github.com/redhat-developer/vscode-tekton/issues/189)start task command is not working
* [#249](https://github.com/redhat-developer/vscode-tekton/issues/249)Code assist for pipelines
* [#223](https://github.com/redhat-developer/vscode-tekton/issues/223)Add support for workspaces on start flow
* Bugfixes or minor issues:
  * [#261](https://github.com/redhat-developer/vscode-tekton/issues/261)While refreshing deleting a resource throw error.
  * [#253](https://github.com/redhat-developer/vscode-tekton/issues/253)Remove direct dependency on K8's extension
  * [#271](https://github.com/redhat-developer/vscode-tekton/issues/271)Can't start a pipeline without resource
  * [#254](https://github.com/redhat-developer/vscode-tekton/issues/254)Check 'tkn' presents and version on extension sturtup
  * [#263](https://github.com/redhat-developer/vscode-tekton/issues/263)Undefined in error if not logged in

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
