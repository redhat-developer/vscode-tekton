#!/usr/bin/env groovy

node('rhel8'){

  stage('Checkout repo') {
    deleteDir()
    git url: "https://github.com/${params.FORK}/vscode-tekton.git", branch: params.BRANCH
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

    stage('Package') {
        def packageJson = readJSON file: 'package.json'
        writeJSON file: 'package.json', json: packageJson, pretty: 4
        sh "vsce package -o tekton-pipelines-${packageJson.version}-${env.BUILD_NUMBER}.vsix"
        sh "sha256sum *.vsix > tekton-pipelines-${packageJson.version}-${env.BUILD_NUMBER}.vsix.sha256"
    }

    if(params.UPLOAD_LOCATION) {
        stage('Snapshot') {
            sh "sftp -C ${UPLOAD_LOCATION}/snapshots/vscode-tekton/ <<< \$'put -p *.vsix*'"
        }
    }

    if(publishToMarketPlace.equals('true') || publishToOVSX.equals('true')){
        timeout(time:5, unit:'DAYS') {
            input message:'Approve deployment?', submitter: 'degolovi, msuman'
    }

    stage("Publish to Marketplace") {
        withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
          def vsix = findFiles(glob: '**.vsix')
          sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
        }

        stage "Promote the build to stable"
        sh "sftp -C ${UPLOAD_LOCATION}/stable/vscode-tekton/ <<< \$'put -p *.vsix*'"
        archive includes:"**.vsix*"
        }
    }

    if (publishToOVSX.equals('true')) {
        stage("Publish to OVSX") {
            sh "npm install -g ovsx"
            withCredentials([[$class: 'StringBinding', credentialsId: 'open-vsx-access-token', variable: 'OVSX_TOKEN']]) {
            sh "ovsx publish -p ${OVSX_TOKEN} vscode-tekton-${packageJson.version}-${env.BUILD_NUMBER}-ovsx.vsix"
        }
      }
    }
}
