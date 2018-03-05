import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { loadWebhookEvent } from './Github';
import handler from './handler';
import { ensureError } from './utils';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/webhook', async (req: Request, res: Response) => {
  res.type('txt');

  try {
    const event = loadWebhookEvent(req);
    const result = await handler(event);
    res.send(result);
  } catch (err) {
    const error = ensureError(err);
    res.status(500);
    res.send(`Failed: ${error.message}`);
  }
});

export default app;
