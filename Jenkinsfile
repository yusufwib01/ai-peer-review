pipeline {
  agent any
  tools { nodejs 'NodeJS 24.10.0' }

  environment {
    API_URL             = 'https://api.deepseek.com/v1/chat/completions'
    OUT_JSON            = 'ai-report.json'
    MAX_DIFF_BYTES      = '400000'
    DEEPSEEK_API_KEY_ID = 'deepseek-api-key'
  }

  parameters {
    string(name: 'GIT_REPO', defaultValue: 'https://github.com/yusufwib01/ai-peer-review-check.git')
    string(name: 'TARGET_COMMIT', defaultValue: '', description: 'Commit hash to review')
    choice(name: 'MODEL_NAME', choices: ['deepseek-chat', 'deepseek-reasoner'], description: 'AI model')
  }

  stages {
    stage('Checkout') {
      steps {
        sh '''
          set -eu
          : "${GIT_REPO:?GIT_REPO required}"
          : "${TARGET_COMMIT:?TARGET_COMMIT required}"

          rm -rf .git
          git init
          git remote add origin "${GIT_REPO}"

          git -c protocol.version=2 fetch --prune --no-tags --progress origin \
            +refs/heads/*:refs/remotes/origin/* \
            +refs/tags/*:refs/tags/* || true

          git rev-parse --verify --quiet "${TARGET_COMMIT}^{commit}" >/dev/null || \
            git fetch --no-tags origin "${TARGET_COMMIT}"
        '''
      }
    }

    stage('Create diff') {
      steps {
        sh '''
          set -eu
          git rev-parse --verify --quiet "${TARGET_COMMIT}^{commit}" >/dev/null || { echo "Missing or invalid TARGET_COMMIT: ${TARGET_COMMIT}"; exit 2; }

          echo "[INFO] Generating diff for commit ${TARGET_COMMIT}"
          git show -m --first-parent --unified=1 --no-color --find-renames --find-copies \
            "${TARGET_COMMIT}" -- \
            "*.php" "*.mustache" "*.js" "*.ts" "*.json" "*.css" \
            ":!vendor/*" ":!node_modules/*" > diff.patch || true

          BYTES=$(wc -c < diff.patch | tr -d ' ')
          MAX=${MAX_DIFF_BYTES}
          if [ "$BYTES" -gt "$MAX" ]; then
            echo "[WARN] Diff is $BYTES bytes, truncating to $MAX" >&2
            head -c "$MAX" diff.patch > diff.trunc && mv diff.trunc diff.patch
          fi
        '''
      }
    }

    stage('Install & Build') {
      steps {
        sh '''
          set -eu
          command -v node >/dev/null 2>&1 || { echo "Node.js not installed on agent"; exit 1; }
          if [ -f package-lock.json ]; then npm ci; else npm i --no-audit --no-fund; fi
          npm run build
        '''
      }
    }

    stage('Review') {
      steps {
        withCredentials([string(credentialsId: env.DEEPSEEK_API_KEY_ID, variable: 'DEEPSEEK_API_KEY')]) {
          sh 'npm run review'
        }
      }
    }

    stage('Comment on GitHub (App)') {
      when { expression { fileExists('ai-report.json') } }
      steps {
        withCredentials([
          file(credentialsId: 'github-app-key', variable: 'GITHUB_APP_PEM_FILE'),
          string(credentialsId: 'github-app-id', variable: 'GITHUB_APP_ID'),
          string(credentialsId: 'github-installation-id', variable: 'GITHUB_INSTALLATION_ID')
        ]) {
          sh 'npm run comment'
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'ai-report.json,diff.patch', allowEmptyArchive: true
    //   script {
    //     if (fileExists('diff.patch')) {
    //       echo 'Commit Patch';  echo readFile('diff.patch')
    //     }
    //     if (fileExists('ai-report.json')) {
    //       echo 'AI Review Report'; echo readFile('ai-report.json')
    //     }
    //   }
    }
  }
}
