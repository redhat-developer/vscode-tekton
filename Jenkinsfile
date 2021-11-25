#!/usr/bin/env groovy

node('rhel8'){

    stage ('Checkout vscode-tekton code') {
        deleteDir()
        git branch: 'main', url: 'https://github.com/redhat-developer/vscode-tekton.git'
    }

    stage ('Install vscode-tekton build requirements') {
        def nodeHome = tool 'nodejs-lts'
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
        sh "vsce package -o tekton-pipelines-${packageJson.version}-${env.BUILD_NUMBER}.vsix"
        sh "sha256sum *.vsix > tekton-pipelines-${packageJson.version}-${env.BUILD_NUMBER}.vsix.sha256"
    }

    if(params.UPLOAD_LOCATION) {
        stage('Snapshot') {
            def filesToPush = findFiles(glob: '**.vsix')
            sh "rsync -Pzrlt --rsh=ssh --protocol=28 *.vsix* ${UPLOAD_LOCATION}/snapshots/vscode-tekton/"
            stash name:'vsix', includes:filesToPush[0].path
        }
    }
}

node('rhel8'){
    if(publishToMarketPlace.equals('true')){
        timeout(time:5, unit:'DAYS') {
            input message:'Approve deployment?', submitter: 'degolovi,yvydolob,sverma'
        }

        stage ("Publish to Marketplace") {
            unstash 'vsix';
            def vsix = findFiles(glob: '**.vsix')
            withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
                sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
            }

            // Open-vsx Marketplace
            sh "npm install -g ovsx"
            withCredentials([[$class: 'StringBinding', credentialsId: 'open-vsx-access-token', variable: 'OVSX_TOKEN']]) {
                sh 'ovsx publish -p ${OVSX_TOKEN}' + " ${vsix[0].path}"
            }
            archive includes:"**.vsix*"

            stage ("Promote the build to stable") {
                sh "rsync -Pzrlt --rsh=ssh --protocol=28 *.vsix* ${UPLOAD_LOCATION}/stable/vscode-tekton/"
            }
        }
    }
}
