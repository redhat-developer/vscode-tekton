# Change Log

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
