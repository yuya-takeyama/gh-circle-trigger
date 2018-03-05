import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import Circleci from './Circleci';
import { loadConfig } from './config';
import Github, { loadWebhookEvent } from './Github';
import Handler from './Handler';
import { ensureError, isInvalidSignature } from './utils';

const app = express();
const config = loadConfig();
const handler = new Handler(
  Github.fromConfig(config),
  Circleci.fromConfig(config),
);

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/webhook', async (req: Request, res: Response) => {
  res.type('txt');

  try {
    if (
      isInvalidSignature(
        typeof req.body.payload === 'string' ? req.body.payload : '',
        req.header('X-Hub-Signature'),
        process.env.GH_CIRCLE_TRIGGER_WEBHOOK_SECRET,
      )
    ) {
      res.status(403);
      return res.send('Failed: Invalid signature');
    }

    const event = loadWebhookEvent(req);
    const result = await handler.handle(event);
    res.send(result);
  } catch (err) {
    const error = ensureError(err);
    res.status(500);
    res.send(`Failed: ${error.message}`);
  }
});

export default app;
