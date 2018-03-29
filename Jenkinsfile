#!/usr/bin/env groovy

/*
 * node versions: https://hub.docker.com/r/library/node/tags/
 */
def VERSIONS_MATRIX = [
        [
                node : '6'
        ],
        [
                node : '8'
        ],
        [
                node : '9'
        ]
]

node('master') {
    def REVISION

    try {
        stage('Checkout') {
            deleteDir()
            def scmVars = checkout scm
            sh 'echo "Dockerfile-*" >> .dockerignore'

            REVISION = scmVars.GIT_COMMIT
        }

        def template = readFile("${env.WORKSPACE}/Dockerfile.template")

        VERSIONS_MATRIX.collect { version ->
            stage("Node: ${version.node}") {
                def tag = "${REVISION}-${version.node}"
                def dockerfile = "Dockerfile-${tag}"

                writeFile(
                        file: dockerfile,
                        text: template
                                .replaceAll('\\$NODE_VERSION', version.node)
                )

                def image = docker.build("vault-env:${tag}", "-f ${dockerfile} .")

                sh "docker run -v ${env.WORKSPACE}/report:/app/report ${image.id}"
                junit "report/mocha.xml"
                sh "rm -rf report/*.xml"

                if (currentBuild.result == 'UNSTABLE') {
                    error 'Tests failed.'
                }
            }
        }

        currentBuild.result = 'SUCCESS'
    } catch (e) {
        echo e.toString()
        currentBuild.result = 'FAILED'
    }
    finally {
        step([$class: 'StashNotifier'])
    }
}
