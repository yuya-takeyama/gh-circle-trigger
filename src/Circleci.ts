import axios from 'axios';
import { TriggerCommand } from './commands';
import { Config } from './config';
import { ensureError } from './utils';

export interface BuildResult {
  buildUrl: string;
}

export default class Circleci {
  private apiToken: Readonly<string>;

  static fromConfig(config: Config) {
    return new Circleci(config.circleApiToken);
  }

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async triggerBuild(command: TriggerCommand): Promise<BuildResult> {
    try {
      const res = await this.post(this.triggerApiUrl(command), {
        build_parameters: {
          CIRCLE_JOB: command.job,
        },
      });

      if (typeof res.data.build_url === 'string') {
        return {
          buildUrl: res.data.build_url,
        };
      }

      return Promise.reject(new Error('Invalid build trigger response'));
    } catch (err) {
      return Promise.reject(ensureError(err));
    }
  }

  private post(url: string, body: { [keys: string]: any }) {
    return axios.post<{ [keys: string]: any }>(url, body, {
      responseType: 'json',
      auth: {
        username: this.apiToken,
        password: '',
      },
    });
  }

  private triggerApiUrl(command: TriggerCommand): string {
    return `https://circleci.com/api/v1.1/project/github/${
      command.repository
    }/tree/${command.branch}`;
  }
}
