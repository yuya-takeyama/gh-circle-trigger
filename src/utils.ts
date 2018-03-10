import crypto from 'crypto';

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
