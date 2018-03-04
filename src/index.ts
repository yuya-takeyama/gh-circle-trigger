import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import Circleci from './Circleci';
import { Config, loadConfig } from './config';
import Github, { loadWebhookEvent } from './Github';
import { ensureError } from './utils';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/webhook', async (req: Request, res: Response) => {
  res.type('txt');

  try {
    const config: Config = app.get('config');
    const github = Github.fromConfig(config);
    const circleci = Circleci.fromConfig(config);
    const event = loadWebhookEvent(req);
    const buildParam = await github.paraseBuildParameter(event);
    if (buildParam && buildParam.job) {
      const buildResult = await circleci.triggerBuild(buildParam);
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

const config = loadConfig();
app.set('config', config);

export default app;
