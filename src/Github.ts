import axios from 'axios';
import escapeStringRegexp from 'escape-string-regexp';
import { Request } from 'express';
import { BuildResult } from './circleci';
import { Config } from './config';
import {
  GithubWebhookEvent,
  GithubWebhookEventPayload,
  IssueCommentEvent,
  PullRequestEntity,
  PullRequestEvent,
  TargetGithubEvent,
} from './interfaces/github';

interface GithubRequestHeader {
  Authorization: string;
}

export interface BuildParameter {
  repository: string;
  branch: string;
  pullRequest: PullRequestEntity;
  job?: string;
}

export default class Github {
  private accessToken: Readonly<string>;
  private triggerWord: Readonly<string>;

  static fromConfig(config: Config): Github {
    return new Github(config.githubAccessToken, config.triggerWord);
  }

  constructor(accessToken: string, triggerWord: string) {
    this.accessToken = accessToken;
    this.triggerWord = triggerWord;
  }

  async paraseBuildParameter(
    event: GithubWebhookEvent,
  ): Promise<BuildParameter | undefined> {
    if (this.isTargetEvent(event)) {
      if (this.isPullRequestEvent(event)) {
        return this.pullRequestEventToBuildParameter(event);
      }

      return this.issueCommentEventToBuildParameter(event);
    }

    return undefined;
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

  private pullRequestEventToBuildParameter(
    event: PullRequestEvent,
  ): BuildParameter {
    return {
      branch: event.payload.pull_request.head.ref,
      repository: event.payload.repository.full_name,
      pullRequest: event.payload.pull_request,
      job: parseTargetJob(event.payload.pull_request.body, this.triggerWord),
    };
  }

  private async issueCommentEventToBuildParameter(
    event: IssueCommentEvent,
  ): Promise<BuildParameter> {
    const pullRequest = await this.getPullRequest(
      event.payload.issue.pull_request.url,
    );

    return {
      pullRequest,
      branch: pullRequest.head.ref,
      repository: event.payload.repository.full_name,
      job: parseTargetJob(event.payload.comment.body, this.triggerWord),
    };
  }

  private parsePullRequest(data: { [keys: string]: any }): PullRequestEntity {
    if (typeof data.url === 'string' && typeof data.comments_url === 'string') {
      return data as PullRequestEntity;
    }

    throw new Error('Invalid PullRequest response');
  }

  private isTargetEvent(event: GithubWebhookEvent): event is TargetGithubEvent {
    return (
      (this.isPullRequestEvent(event) && event.payload.action === 'opened') ||
      (this.isIssueCommentEvent(event) && event.payload.action === 'created')
    );
  }

  private isPullRequestEvent(
    event: GithubWebhookEvent,
  ): event is PullRequestEvent {
    return event.event === 'pull_request';
  }

  private isIssueCommentEvent(
    event: GithubWebhookEvent,
  ): event is IssueCommentEvent {
    return event.event === 'issue_comment';
  }
}

export const loadWebhookEvent = (req: Request): GithubWebhookEvent => ({
  event: req.header('X-Github-Event'),
  payload: JSON.parse(req.body.payload) as GithubWebhookEventPayload,
});

export const parseTargetJob = (
  body: string,
  triggerWord: string,
): string | undefined => {
  const pattern = `^\\s*${escapeStringRegexp(triggerWord)}\\s+([a-zA-Z_\\-]+)`;
  const regexp = new RegExp(pattern, 'm');
  const matches = body.match(regexp);
  if (matches) {
    return matches[1];
  }
};
