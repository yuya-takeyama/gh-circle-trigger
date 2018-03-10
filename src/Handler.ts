import Circleci from './Circleci';
import { CommandParser, TriggerCommand } from './commands';
import { Config } from './config';
import Github from './Github';
import { GithubWebhookEvent } from './interfaces/github';
import { ensureError } from './utils';

export default class Handler {
  private github: Readonly<Github>;
  private circleci: Readonly<Circleci>;
  private commandParser: Readonly<CommandParser>;

  static fromConfig(config: Config): Handler {
    const github = Github.fromConfig(config);
    return new this(
      github,
      Circleci.fromConfig(config),
      new CommandParser(github, config.triggerWord),
    );
  }

  constructor(
    github: Github,
    circleci: Circleci,
    commandParser: CommandParser,
  ) {
    this.github = github;
    this.circleci = circleci;
    this.commandParser = commandParser;
  }

  async handle(
    event: GithubWebhookEvent,
    allowedJobs: string[],
  ): Promise<string> {
    const command = await this.commandParser.parse(event);

    if (command.type === 'trigger') {
      return this.handleTriggerCommand(command, allowedJobs);
    }

    return 'NOOP';
  }

  private async handleTriggerCommand(
    command: TriggerCommand,
    allowedJobs: string[],
  ) {
    if (this.isNotAllowed(command.job, allowedJobs)) {
      await this.github.postJobNotAllowedMessage(command, allowedJobs);
      return `Not allowed: ${command.job}`;
    }

    const buildResult = await this.circleci
      .triggerBuild(command)
      .catch(async err => {
        const error = ensureError(err);
        await this.postErrorMessageToGithub(command, err);
        throw error;
      });
    await this.github.notifyBuildUrl(command.pullRequest, buildResult);
    return `Trigger: ${command.job}, Branch: ${command.branch}`;
  }

  private isNotAllowed(job: string, allowedJobs: string[]): boolean {
    return (
      allowedJobs.length > 0 &&
      !allowedJobs.find(allowedJob => allowedJob === job)
    );
  }

  private async postErrorMessageToGithub(
    command: TriggerCommand,
    err: Error,
  ): Promise<void> {
    try {
      await this.github.postPullRequestComment(
        command.pullRequest,
        `Failed to trigger a build: ${err.message}`,
      );
      return undefined;
    } catch (err) {
      // Don't care if it failed to write comment
      return undefined;
    }
  }
}
