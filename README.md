# GH Circle Trigger

Triggers Circle CI builds from GitHub Pull Requests's comments.

By commenting in Pull Requests, you can trigger builds on Circle CI with the branch:

```
@ghcirclebot trigger deploy_staging
```

This triggers a job named `deploy_staging` defined in the Circle CI config file.

## Deploy

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Setup

### Setup webhook

* Payload URL: `https://URL/webhook`
* Content type: `application/x-www-form-urlencoded`
* Secret (Optional)
  * When you'd like to protect the app by verifying requests, specify a secret key.
  * Set the same environment variable named `GH_CIRCLE_TRIGGER_WEBHOOK_SECRET`.
* Events
  * Select `Let me select individual events.`
    * Issue comment
    * Pull request
