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
  * When you'd like to specify allowed jobs to trigger, append a comma-separated list of the jobs named `allowed_jobs` (e.g. `https://URL/webhook?allowed_jobs=test,deploy`)
* Content type: `application/x-www-form-urlencoded`
* Secret (Optional)
  * When you'd like to protect the app by verifying requests, specify a secret key.
  * Set the same environment variable named `GH_CIRCLE_TRIGGER_WEBHOOK_SECRET`.
* Events
  * Select `Let me select individual events.`
    * Issue comment
    * Pull request

### Limit arbitrary jobs to trigger

By default, every job can be triggered.

But when you'd like to only allowed jobs, you have 2 options:

* Set `GH_CIRCLE_TRIGGER_ALLOWED_JOBS` to environment variables
  * This is the global configuration.
* Set `allowed_jobs` as a query parameter
  * This can be used as a repository-specific configuration. You can allow a different set of jobs for each repository.
