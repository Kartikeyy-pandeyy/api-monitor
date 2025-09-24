pipeline {
  agent any
  options { skipDefaultCheckout(true) }    // don't do the default; we'll do an explicit, clean checkout

  environment {
    AWS_REGION         = 'us-east-1'
    AWS_CREDENTIALS_ID = 'jenkins'          // Jenkins > Credentials ID
    S3_BUCKET          = 'api-monitor-data-bu'
  }

  triggers { cron('H/30 * * * *') }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()                         // nuke any half-initialized workspace
        checkout scm                        // checkout the same repo/branch Jenkinsfile came from
        sh 'git log -1 --oneline'
      }
    }

    stage('Docker Sanity') {
      steps {
        sh '''
          docker --version
          docker info | head -n 12
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t api-checker:latest .'
      }
    }

    stage('Run API Checker') {
  steps {
    sh '''
      set -eux

      # clean output dir in Jenkins workspace
      rm -rf frontend
      mkdir -p frontend

      # create a container (does not start), then run it and capture logs
      cid=$(docker create \
        -e OUTPUT_DIR=/app/frontend \
        -e ENDPOINTS_FILE=/app/checker/apis.json \
        api-checker:latest)

      # start and attach to see logs in Jenkins
      docker start -a "$cid"

      # copy results out of the stopped container into the workspace
      docker cp "$cid":/app/frontend/. frontend/

      # cleanup
      docker rm "$cid"

      # show what we actually have for the next stages
      ls -la frontend
    '''
  }
}





    stage('Upload to S3') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: env.AWS_CREDENTIALS_ID,
                          accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                          secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
          sh '''
            test -f frontend/status.json  || { echo "Missing frontend/status.json";  exit 1; }
            test -f frontend/history.json || { echo "Missing frontend/history.json"; exit 1; }

            aws s3 cp frontend/status.json  s3://$S3_BUCKET/frontend/status.json  --region $AWS_REGION
            aws s3 cp frontend/history.json s3://$S3_BUCKET/frontend/history.json --region $AWS_REGION
          '''
        }
      }
    }

    stage('Archive Results') {
      steps {
        archiveArtifacts artifacts: 'frontend/status.json, frontend/history.json', fingerprint: true
      }
    }
  }

  post {
    failure { echo 'Pipeline failed! Consider sending alert here.' }
  }
}
