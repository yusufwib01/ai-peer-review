Requirements
- Jenkins with NodeJS tool
- Credentials:
  - Secret Text: id=deepseek-api-key
  - GitHub App:
    - Secret file: id=github-app-key (.pem)
    - Secret text: id=github-app-id (App ID integer)
    - Secret text: id=github-installation-id (Installation ID integer)

Job Parameters
- GIT_REPO: repo to fetch commit object from
- TARGET_COMMIT: SHA to review
- MODEL_NAME: deepseek-chat | deepseek-reasoner

Outputs
- ai-report.json, diff.patch
