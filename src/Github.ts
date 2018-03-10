import axios from 'axios';
import { Request } from 'express';
import { BuildResult } from './Circleci';
import { TriggerCommand } from './commands';
import { Config } from './config';
import {
  GithubWebhookEvent,
  GithubWebhookEventPayload,
  PullRequestEntity,
} from './interfaces/github';

interface GithubRequestHeader {
  Authorization: string;
}

export default class Github {
  private accessToken: Readonly<string>;

  static fromConfig(config: Config): Github {
    return new Github(config.githubAccessToken);
  }

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async postPullRequestComment(pullRequest: PullRequestEntity, body: string) {
    return this.post(pullRequest.comments_url, { body });
  }

  async getPullRequest(url: string) {
    const res = await this.get(url);
    return this.parsePullRequest(res.data);
  }

  async notifyBuildUrl(
    pullRequest: PullRequestEntity,
    buildResult: BuildResult,
  ) {
    return this.postPullRequestComment(
      pullRequest,
      `Build triggered: ${buildResult.buildUrl}`,
    );
  }

  async postJobNotAllowedMessage(
    command: TriggerCommand,
    allowedJobs: string[],
  ) {
    return this.postPullRequestComment(
      command.pullRequest,
      'The job `' +
        command.job +
        '` is not allowed to trigger.\n' +
        'Allowed jobs are:\n\n' +
        allowedJobs.map(job => `* ${job}`).join('\n'),
    );
  }

  private async get(url: string) {
    return axios.get<{ [keys: string]: any }>(url, this.requestConfig());
  }

  private async post(url: string, body: { [keys: string]: any }) {
    return axios.post<{ [keys: string]: any }>(
      url,
      JSON.stringify(body),
      this.requestConfig(),
    );
  }

  private requestConfig() {
    return {
      responseType: 'json',
      headers: this.authHeader(),
    };
  }

  private authHeader(): GithubRequestHeader {
    return {
      Authorization: `token ${this.accessToken}`,
    };
  }

  private parsePullRequest(data: { [keys: string]: any }): PullRequestEntity {
    if (typeof data.url === 'string' && typeof data.comments_url === 'string') {
      return data as PullRequestEntity;
    }

    throw new Error('Invalid PullRequest response');
  }
}

export const loadWebhookEvent = (req: Request): GithubWebhookEvent => ({
  event: req.header('X-Github-Event'),
  payload: JSON.parse(req.body.payload) as GithubWebhookEventPayload,
});
