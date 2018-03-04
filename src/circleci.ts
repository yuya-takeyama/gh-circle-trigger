import axios from 'axios';
import { Config } from './config';
import { BuildParameter } from './Github';
import { ensureError } from './utils';

export interface BuildResult {
  buildUrl: string;
}

export const triggerBuild = async (
  param: BuildParameter,
  config: Config,
): Promise<BuildResult> => {
  try {
    if (typeof param.job !== 'string') {
      return Promise.reject(
        new Error('Invalid build parameter: job is not specified'),
      );
    }

    const res = await axios.post<{ [keys: string]: any }>(
      triggerApiUrl(param),
      {
        'build_parameters[CIRCLE_JOB]': param.job,
      },
      {
        responseType: 'json',
        auth: {
          username: config.circleApiToken,
          password: '',
        },
      },
    );

    if (typeof res.data.build_url === 'string') {
      return {
        buildUrl: res.data.build_url,
      };
    }

    return Promise.reject(new Error('Invalid build trigger response'));
  } catch (err) {
    console.error(err);
    const error = ensureError(err);
    return Promise.reject(error);
  }
};

const triggerApiUrl = (param: BuildParameter): string => {
  return `https://circleci.com/api/v1.1/project/github/${
    param.repository
  }/tree/${param.branch}`;
};
