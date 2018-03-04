import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import Circleci from './Circleci';
import { loadConfig } from './config';
import Github, { loadWebhookEvent } from './Github';
import { ensureError } from './utils';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

const config = loadConfig();
const github = Github.fromConfig(config);
const circleci = Circleci.fromConfig(config);

app.post('/webhook', async (req: Request, res: Response) => {
  res.type('txt');

  try {
    const event = loadWebhookEvent(req);
    const buildParam = await github.paraseBuildParameter(event);
    if (buildParam && buildParam.job) {
      const buildResult = await circleci.triggerBuild(buildParam).catch(err => {
        const error = ensureError(err);
        github.postPullRequestComment(
          buildParam.pullRequest,
          `Failed to trigger a build: ${error.message}`,
        );
        throw error;
      });
      await github.notifyBuildUrl(buildParam.pullRequest, buildResult);
      res.send(`Trigger: ${buildParam.job}, Branch: ${buildParam.branch}`);
    } else {
      res.send('NOOP');
    }
  } catch (err) {
    const error = ensureError(err);
    res.status(500);
    res.send(`Failed: ${error.message}`);
  }
});

export default app;
