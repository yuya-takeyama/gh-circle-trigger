import Github from './Github';
import {
  GithubWebhookEvent,
  IssueCommentEvent,
  PullRequestEntity,
  PullRequestEvent,
  TargetGithubEvent,
} from './interfaces/github';
import { parseComment } from './utils';

export type Command = TriggerCommand | HelpCommand | NoopCommand;

export interface TriggerCommand {
  type: 'trigger';
  repository: string;
  pullRequest: PullRequestEntity;
  branch: string;
  job: string;
}

export interface HelpCommand {
  type: 'help';
  pullRequest: PullRequestEntity;
}

export interface NoopCommand {
  type: 'noop';
}

export class CommandParser {
  private github: Readonly<Github>;
  private triggerWord: Readonly<string>;

  constructor(github: Github, triggerWord: string) {
    this.github = github;
    this.triggerWord = triggerWord;
  }

  async parse(event: GithubWebhookEvent): Promise<Command> {
    if (this.isTargetEvent(event)) {
      if (this.isPullRequestEvent(event)) {
        return this.parsePullRequestEvent(event);
      }

      return this.parseIssueCommentEvent(event);
    }

    return { type: 'noop' };
  }

  isTargetEvent = (event: GithubWebhookEvent): event is TargetGithubEvent => {
    return (
      (this.isPullRequestEvent(event) && event.payload.action === 'opened') ||
      (this.isIssueCommentEvent(event) && event.payload.action === 'created')
    );
  };

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

  private parsePullRequestEvent(event: PullRequestEvent): Command {
    const command = parseComment(
      event.payload.pull_request.body,
      this.triggerWord,
    );
    if (command) {
      if (command.type === 'trigger') {
        return {
          type: 'trigger',
          job: command.job,
          branch: event.payload.pull_request.head.ref,
          repository: event.payload.repository.full_name,
          pullRequest: event.payload.pull_request,
        };
      }
      if (command.type === 'help') {
        return {
          type: 'help',
          pullRequest: event.payload.pull_request,
        };
      }
    }

    return { type: 'noop' };
  }

  private async parseIssueCommentEvent(
    event: IssueCommentEvent,
  ): Promise<Command> {
    const command = parseComment(event.payload.comment.body, this.triggerWord);
    if (command === void 0) {
      return { type: 'noop' };
    }

    const pullRequest = await this.github.getPullRequest(
      event.payload.issue.pull_request.url,
    );

    if (command.type === 'trigger') {
      return {
        pullRequest,
        job: command.job,
        type: 'trigger',
        branch: pullRequest.head.ref,
        repository: event.payload.repository.full_name,
      };
    }
    if (command.type === 'help') {
      return {
        pullRequest,
        type: 'help',
      };
    }

    return { type: 'noop' };
  }
}
