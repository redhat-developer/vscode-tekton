#!/usr/bin/env groovy

def installBuildRequirements(){
	def nodeHome = tool 'nodejs-8.11.1'
	env.PATH="${env.PATH}:${nodeHome}/bin"
	sh "npm install -g typescript vsce"
}

def buildVscodeExtension(){
	sh "npm install"
	sh "npm run vscode:prepublish"
}

node('rhel7'){

	stage 'Checkout vscode-tekton code'
	deleteDir()
	git url: 'https://github.com/redhat-developer/vscode-tekton.git'

	stage 'install vscode-tekton build requirements'
	installBuildRequirements()

	stage 'Build vscode-tekton'
	sh "npm install"
	sh "npm run vscode:prepublish"

	stage 'Test vscode-tekton for staging'
	wrap([$class: 'Xvnc']) {
		sh "npm test --silent"
	}

	stage "Package vscode-tekton"
	def packageJson = readJSON file: 'package.json'
    packageJson.extensionDependencies = ["ms-kubernetes-tools.vscode-kubernetes-tools"]
    writeJSON file: 'package.json', json: packageJson, pretty: 4
	sh "vsce package -o yaml-${packageJson.version}-${env.BUILD_NUMBER}.vsix"

	stage 'Upload vscode-tekton to staging'
	def vsix = findFiles(glob: '**.vsix')
	sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${vsix[0].path} ${UPLOAD_LOCATION}"
	stash name:'vsix', includes:vsix[0].path
}

node('rhel7'){
	timeout(time:5, unit:'DAYS') {
		input message:'Approve deployment?', submitter: 'ltulloch'
	}

	stage "Publish to Marketplace"
	unstash 'vsix';
	withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
		def vsix = findFiles(glob: '**.vsix')
		sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
	}
	archive includes:"**.vsix"
}


