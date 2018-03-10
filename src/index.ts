import express, { Request, Response } from 'express';
import Circleci from './Circleci';
import { loadConfig } from './config';
import Github, { loadWebhookEvent } from './Github';
import Handler from './Handler';
import { allowedJobs, decode, ensureError, isInvalidSignature } from './utils';

const app = express();
const config = loadConfig();
const handler = new Handler(
  Github.fromConfig(config),
  Circleci.fromConfig(config),
);

export interface RequestWithRawBody extends Request {
  rawBody?: string;
  body: { [keys: string]: any };
}

app.use((req: RequestWithRawBody, _, next) => {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', chunk => {
    req.rawBody = `${req.rawBody}${chunk}`;
  });

  req.on('end', () => {
    if (typeof req.rawBody === 'string') {
      req.body = req.rawBody
        .split('&')
        .reduce<{ [keys: string]: any }>((acc, keyValue) => {
          const [key, value] = keyValue.split('=');
          acc[decode(key)] = decode(value);
          return acc;
        }, {});
    }
    next();
  });
});

app.post('/webhook', async (req: RequestWithRawBody, res: Response) => {
  res.type('txt');

  try {
    if (
      isInvalidSignature(
        typeof req.rawBody === 'string' ? req.rawBody : '',
        req.header('X-Hub-Signature'),
        process.env.GH_CIRCLE_TRIGGER_WEBHOOK_SECRET,
      )
    ) {
      res.status(403);
      return res.send('Failed: Invalid signature');
    }

    const event = loadWebhookEvent(req);
    const result = await handler.handle(
      event,
      allowedJobs(config.allowedJobs, req.query.allowed_jobs),
    );
    res.send(result);
  } catch (err) {
    const error = ensureError(err);
    res.status(500);
    res.send(`Failed: ${error.message}`);
  }
});

export default app;
