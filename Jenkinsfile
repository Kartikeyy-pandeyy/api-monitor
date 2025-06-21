pipeline {
  agent any

  triggers {
    cron('H/10 * * * *')  // Run every 10 minutes
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/Kartikeyy-pandeyy/api-monitor.git'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t api-checker .'
      }
    }

    stage('Run API Checker') {
      steps {
        sh 'docker run --rm -v $WORKSPACE/frontend:/app/frontend api-checker'
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
