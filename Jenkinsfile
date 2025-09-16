pipeline {
  agent any

  environment {
    AWS_REGION         = 'ap-east-1'
    AWS_CREDENTIALS_ID = 'jenkins'              // must match Jenkins → Credentials ID
    S3_BUCKET          = 'api-monitor-data-bu'
  }

  triggers {
    cron('H/10 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/Kartikeyy-pandeyy/api-monitor.git'
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
        sh 'docker run --rm -v "$WORKSPACE/frontend:/app/frontend" api-checker:latest'
      }
    }

    stage('Upload to S3') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: "${env.AWS_CREDENTIALS_ID}",
          accessKeyVariable: 'AWS_ACCESS_KEY_ID',
          secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
        ]]) {
          sh '''
            test -f frontend/status.json  && echo "status.json present"  || (echo "Missing status.json" && exit 1)
            test -f frontend/history.json && echo "history.json present" || (echo "Missing history.json" && exit 1)

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
    failure {
      echo "Pipeline failed! Consider sending alert here."
    }
  }
}
