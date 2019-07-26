#!/usr/bin/env groovy

node('rhel7'){

    stage ('Checkout vscode-tekton code') {
        deleteDir()
        git url: 'https://github.com/redhat-developer/vscode-tekton.git'
    }

    stage ('Install vscode-tekton build requirements') {
        def nodeHome = tool 'nodejs-8.11.1'
        env.PATH="${env.PATH}:${nodeHome}/bin"
        sh "npm install -g typescript vsce"
    }

    stage ('Build vscode-tekton') {
        sh "npm install"
        sh "npm run vscode:prepublish"
    }

    withEnv(['JUNIT_REPORT_PATH=report.xml']) {
        stage('Test') {
            wrap([$class: 'Xvnc']) {
                sh "npm test --silent"
                junit 'report.xml'
            }
        }
    }

    stage ("Package vscode-tekton") {
        def packageJson = readJSON file: 'package.json'
        packageJson.extensionDependencies = ["ms-kubernetes-tools.vscode-kubernetes-tools"]
        writeJSON file: 'package.json', json: packageJson, pretty: 4
        sh "vsce package -o tekton-pipelines-${packageJson.version}-${env.BUILD_NUMBER}.vsix"
    }

    if(params.UPLOAD_LOCATION) {
        stage('Snapshot') {
            def filesToPush = findFiles(glob: '**.vsix')
            sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${filesToPush[0].path} ${UPLOAD_LOCATION}/snapshots/vscode-tekton/"
            stash name:'vsix', includes:filesToPush[0].path
        }
    }
}

node('rhel7'){
    if(publishToMarketPlace.equals('true')){
        timeout(time:5, unit:'DAYS') {
            input message:'Approve deployment?', submitter: 'ltulloch'
        }

        stage ("Publish to Marketplace") {
            unstash 'vsix';
            withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
                def vsix = findFiles(glob: '**.vsix')
                sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
            }
            archive includes:"**.vsix"

            stage ("Promote the build to stable") {
                def vsix = findFiles(glob: '**.vsix')
                sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${vsix[0].path} ${UPLOAD_LOCATION}/stable/vscode-tekton/"
            }
        }
    }
}
