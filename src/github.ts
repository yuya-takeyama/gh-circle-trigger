import axios from 'axios';
import escapeStringRegexp from 'escape-string-regexp';
import { Request } from 'express';
import { BuildResult } from './circleci';
import { Config } from './config';

export type WebhookRequest =
  | PullRequestEvent
  | IssueCommentEvent
  | GithubWebhookEvent;

type TargetGithubEvent = PullRequestEvent | IssueCommentEvent;

export interface PullRequestEvent {
  event: 'pull_request';
  payload: PullRequestEventPayload;
}

export interface IssueCommentEvent {
  event: 'issue_comment';
  payload: IssueCommentEventPayload;
}

interface GithubWebhookEvent {
  event: string | undefined;
  payload: GithubWebhookEventPayload;
}

interface PullRequestEventPayload extends GithubWebhookEventPayload {
  pull_request: PullRequestEntity;
  repository: RepositoryEntity;
  [keys: string]: any;
}

interface PullRequestEntity {
  url: string;
  id: number;
  body: string;
  comments_url: string;
  head: BranchEntity;
  base: BranchEntity;
  [keys: string]: any;
}

interface IssueCommentEventPayload extends GithubWebhookEventPayload {
  issue: IssueEntity;
  comment: CommentEntity;
  repository: RepositoryEntity;
  [keys: string]: any;
}

interface GithubWebhookEventPayload {
  action: string;
  [keys: string]: any;
}

interface RepositoryEntity {
  full_name: string;
  [keys: string]: any;
}

interface IssueEntity {
  url: string;
  comments_url: string;
  pull_request: PullRequestEntity;
  [keys: string]: any;
}

interface CommentEntity {
  body: string;
  [keys: string]: any;
}

interface BranchEntity {
  ref: string;
  [keys: string]: any;
}

export interface BuildParameter {
  repository: string;
  branch: string;
  pullRequest: PullRequestEntity;
  job?: string;
}

export const paraseBuildParameter = async (
  event: GithubWebhookEvent,
  config: Config,
): Promise<BuildParameter | undefined> => {
  if (isTargetEvent(event)) {
    if (isPullRequestEvent(event)) {
      return pullRequestEventToBuildParameter(event, config);
    }

    return issueCommentEventToBuildParameter(event, config);
  }

  return undefined;
};

const pullRequestEventToBuildParameter = (
  event: PullRequestEvent,
  config: Config,
): BuildParameter => {
  return {
    branch: event.payload.pull_request.head.ref,
    repository: event.payload.repository.full_name,
    pullRequest: event.payload.pull_request,
    job: parseTargetJob(event.payload.pull_request.body, config),
  };
};

const issueCommentEventToBuildParameter = async (
  event: IssueCommentEvent,
  config: Config,
) => {
  const res = await axios.get<{ [keys: string]: any }>(
    event.payload.issue.pull_request.url,
    {
      responseType: 'json',
      headers: authHeader(config),
    },
  );
  const pullRequest = parsePullRequest(res.data);

  return {
    pullRequest,
    branch: pullRequest.head.ref,
    repository: event.payload.repository.full_name,
    job: parseTargetJob(event.payload.comment.body, config),
  };
};

const isTargetEvent = (
  event: GithubWebhookEvent,
): event is TargetGithubEvent => {
  return (
    (isPullRequestEvent(event) && event.payload.action === 'opened') ||
    (isIssueCommentEvent(event) && event.payload.action === 'created')
  );
};

export const loadWebhookEvent = (req: Request): GithubWebhookEvent => ({
  event: req.header('X-Github-Event'),
  payload: JSON.parse(req.body.payload) as GithubWebhookEventPayload,
});

export const notifyBuildUrl = async (
  pullRequest: PullRequestEntity,
  result: BuildResult,
  config: Config,
): Promise<void> => {
  const res = await axios.post<{ [keys: string]: any }>(
    pullRequest.comments_url,
    JSON.stringify({ body: `Build triggered: ${result.buildUrl}` }),
    {
      responseType: 'json',
      headers: authHeader(config),
    },
  );
};

const isPullRequestEvent = (
  event: GithubWebhookEvent,
): event is PullRequestEvent => {
  return event.event === 'pull_request';
};

const isIssueCommentEvent = (
  event: GithubWebhookEvent,
): event is IssueCommentEvent => {
  return event.event === 'issue_comment';
};

const parsePullRequest = (data: { [keys: string]: any }): PullRequestEntity => {
  if (typeof data.url === 'string' && typeof data.comments_url === 'string') {
    return data as PullRequestEntity;
  }

  throw new Error('Invalid PullRequest response');
};

export const parseTargetJob = (
  body: string,
  config: Config,
): string | undefined => {
  const pattern = `^\\s*${escapeStringRegexp(
    config.triggerWord,
  )}\\s+([a-zA-Z_\\-]+)`;
  const regexp = new RegExp(pattern, 'm');
  const matches = body.match(regexp);
  if (matches) {
    return matches[1];
  }
};

interface GithubRequestHeader {
  Authorization: string;
}

export const authHeader = (config: Config): GithubRequestHeader => ({
  Authorization: `token ${config.githubAccessToken}`,
});
