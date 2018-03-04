export type WebhookRequest =
  | PullRequestEvent
  | IssueCommentEvent
  | GithubWebhookEvent;

export type TargetGithubEvent = PullRequestEvent | IssueCommentEvent;

export interface PullRequestEvent {
  event: 'pull_request';
  payload: PullRequestEventPayload;
}

export interface IssueCommentEvent {
  event: 'issue_comment';
  payload: IssueCommentEventPayload;
}

export interface GithubWebhookEvent {
  event: string | undefined;
  payload: GithubWebhookEventPayload;
}

export interface PullRequestEventPayload extends GithubWebhookEventPayload {
  pull_request: PullRequestEntity;
  repository: RepositoryEntity;
  [keys: string]: any;
}

export interface PullRequestEntity {
  url: string;
  id: number;
  body: string;
  comments_url: string;
  head: BranchEntity;
  base: BranchEntity;
  [keys: string]: any;
}

export interface IssueCommentEventPayload extends GithubWebhookEventPayload {
  issue: IssueEntity;
  comment: CommentEntity;
  repository: RepositoryEntity;
  [keys: string]: any;
}

export interface GithubWebhookEventPayload {
  action: string;
  [keys: string]: any;
}

export interface RepositoryEntity {
  full_name: string;
  [keys: string]: any;
}

export interface IssueEntity {
  url: string;
  comments_url: string;
  pull_request: PullRequestEntity;
  [keys: string]: any;
}

export interface CommentEntity {
  body: string;
  [keys: string]: any;
}

export interface BranchEntity {
  ref: string;
  [keys: string]: any;
}
