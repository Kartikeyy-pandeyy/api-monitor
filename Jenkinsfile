pipeline {
  agent any

  environment {
    AWS_REGION = 'ap-east-1' // ✅ change this to your actual region
    AWS_CREDENTIALS_ID = 'jenkins' // ✅ this is the ID you used while adding credentials
    S3_BUCKET = 'api-monitor-data-bu' // ✅ replace with your actual bucket name
  }

  triggers {
    cron('H/10 * * * *') // Runs every 30 minutes
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/Kartikeyy-pandeyy/api-monitor.git'
      }
    }

    stage('Build Docker Image') {
      steps {
        bat 'docker build -t api-checker .'
      }
    }

    stage('Run API Checker') {
      steps {
        bat 'docker run --rm -v %WORKSPACE%\\frontend:/app/frontend api-checker'
      }
    }

    stage('Upload to S3') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: "${env.AWS_CREDENTIALS_ID}"
        ]]) {
          bat '''
            aws s3 cp frontend\\status.json s3://%S3_BUCKET%/status.json --region %AWS_REGION%
            aws s3 cp frontend\\history.json s3://%S3_BUCKET%/history.json --region %AWS_REGION%
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
