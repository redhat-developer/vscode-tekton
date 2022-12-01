# How to contribute

Contributions are essential for ensuring this extension meets developer needs.
There are only a few guidelines that we need contributors to follow and we are open to suggestions for making it even easier to contribute!

## First Time Setup
1. Install prerequisites:
   * latest [Visual Studio Code](https://code.visualstudio.com/)
   * [Node.js](https://nodejs.org/) v4.0.0 or higher
2. Fork and clone the repository
3. `cd vscode-tekton`
4. Install the dependencies:

	```bash
	$ npm install
	```
5. Open the folder in VS Code

## Run the extension locally

1. Install `vsce` - A command line tool you'll use to publish extensions to the Extension Marketplace.
    ```bash
    $ npm install -g vsce
    ```
2. From root folder, run the below command.
    ```bash
    $ vsce package
    ```
3. `tekton-pipelines-<version>.vsix` file is created. Install it by following the instructions [here](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).


4. Once the extension is installed and reloaded, you should see a Tekton Icon on the View Container, as shown in the image below.

![View Tekton Pipelines](https://github.com/redhat-developer/vscode-tekton/blob/main/images/tekton.svg)

> If you have any questions or run into any problems, please post an [issue](https://github.com/redhat-developer/vscode-tekton/issues) - we'll be very happy to help.

## Build the extension snippets

All templates are placed in yaml files in [rawsnippets](./rawsnippets).
If you want to add/change snippets body, you need to edit proper `yaml` file in [rawsnippets](./rawsnippets).
Label and description for each snippet are placed in [build-snippets.ts](build/build-snippets.ts) script.
To generate new snippet json, run:
```bash
$ npm run snippets-build
```
npm script from extension root.

## Generate new icons

If you want to change icons for PipelineRun, TaskRun or Condition, you may want to generate new state icons for failed and pending state.
To do that run:
```bash
$ npm run icon-build
```
npm script from extension root.
New icons will be placed in [images/generated](./images/generated).

### Certificate of Origin

By contributing to this project you agree to the Developer Certificate of
Origin (DCO). This document was created by the Linux Kernel community and is a
simple statement that you, as a contributor, have the legal right to make the
contribution. See the [DCO](DCO) file for details.
