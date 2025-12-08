pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Install') {
      steps { sh 'npm install' }
    }
    stage('Test') {
      steps { sh 'npm test' }
    }
    stage('Build Docker') {
      when { branch 'main' }
      steps { sh 'docker build -t ojat:jenkins .' }
    }
  }
  post {
    always { echo 'Pipeline finished' }
  }
}
