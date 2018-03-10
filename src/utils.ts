import crypto from 'crypto';
import escapeStringRegexp from 'escape-string-regexp';

export const ensureError = (err: Error | string | any): Error => {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === 'string') {
    return new Error(err);
  }
  return new Error('Unknown error');
};

export const isInvalidSignature = (
  payload: string,
  signature: string | undefined,
  webhookSecret: string | undefined,
) => {
  if (typeof webhookSecret === 'string') {
    const calculatedSignature = Buffer.from(
      'sha1=' +
        crypto
          .createHmac('sha1', webhookSecret)
          .update(payload)
          .digest('hex'),
      'utf-8',
    );
    const requestSignature = Buffer.from(
      typeof signature === 'string' ? signature : '',
      'utf-8',
    );

    try {
      return !crypto.timingSafeEqual(calculatedSignature, requestSignature);
    } catch (err) {
      return true;
    }
  }

  return false;
};

export const decode = (url: string | undefined): string => {
  if (url === void 0) {
    return '';
  }

  return decodeURIComponent(url.replace(/\+/g, ' '));
};

export const allowedJobs = (
  fromConfig: string | undefined,
  fromQuery: string | undefined,
): string[] => {
  if (typeof fromQuery === 'string') {
    return fromQuery.split(',');
  }
  if (typeof fromConfig === 'string') {
    return fromConfig.split(',');
  }

  return [];
};

export const DUMMY_JOB_NAME = 'CIRCLE_CI_JOB_NAME';

type CommentCommand = TriggerCommentCommand | HelpCommentCommand;

interface TriggerCommentCommand {
  type: 'trigger';
  job: string;
}

interface HelpCommentCommand {
  type: 'help';
}

export const parseComment = (
  body: string,
  triggerWord: string,
): CommentCommand | undefined => {
  const pattern = `^\\s*${escapeStringRegexp(
    triggerWord,
  )}\\s+(?:(trigger)\\s+([a-zA-Z_\\-]+)|(help))`;
  const regexp = new RegExp(pattern, 'm');
  const matches = body.match(regexp);
  if (matches) {
    if (
      matches[1] &&
      matches[1] === 'trigger' &&
      matches[2] &&
      matches[2] !== DUMMY_JOB_NAME
    ) {
      return { type: 'trigger', job: matches[2] };
    }
    if (matches[3] && matches[3] === 'help') {
      return { type: 'help' };
    }
  }
};
