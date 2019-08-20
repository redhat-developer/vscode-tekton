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

![View Tekton Pipelines](https://github.com/redhat-developer/vscode-tekton/blob/master/images/view-container-icon.png)

> If you have any questions or run into any problems, please post an [issue](issues) - we'll be very happy to help.