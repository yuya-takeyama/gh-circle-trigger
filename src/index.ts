import axios from 'axios';
import bodyParser from 'body-parser';
import { eventNames } from 'cluster';
import express, { Request, Response } from 'express';
import { triggerBuild } from './circleci';
import { Config, loadConfig } from './config';
import {
  loadWebhookEvent,
  notifyBuildUrl,
  paraseBuildParameter,
} from './github';
import { ensureError } from './utils';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/webhook', async (req: Request, res: Response) => {
  res.type('txt');

  try {
    const webhookEvent = loadWebhookEvent(req);
    const config: Config = app.get('config');
    const buildParam = await paraseBuildParameter(
      webhookEvent,
      app.get('config'),
    );
    if (buildParam && buildParam.job) {
      const buildResult = await triggerBuild(buildParam, config);
      await notifyBuildUrl(buildParam.pullRequest, buildResult, config);
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
