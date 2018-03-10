import Circleci from './Circleci';
import { CommandParser, HelpCommand, TriggerCommand } from './commands';
import { Config } from './config';
import Github from './Github';
import { GithubWebhookEvent } from './interfaces/github';
import { ensureError } from './utils';

export default class Handler {
  private github: Readonly<Github>;
  private circleci: Readonly<Circleci>;
  private commandParser: Readonly<CommandParser>;
  private triggerWord: Readonly<string>;

  static fromConfig(config: Config): Handler {
    const github = Github.fromConfig(config);
    return new this(
      github,
      Circleci.fromConfig(config),
      new CommandParser(github, config.triggerWord),
      config.triggerWord,
    );
  }

  constructor(
    github: Github,
    circleci: Circleci,
    commandParser: CommandParser,
    triggerWord: string,
  ) {
    this.github = github;
    this.circleci = circleci;
    this.commandParser = commandParser;
    this.triggerWord = triggerWord;
  }

  async handle(
    event: GithubWebhookEvent,
    allowedJobs: string[],
  ): Promise<string> {
    const command = await this.commandParser.parse(event);

    if (command.type === 'trigger') {
      return this.handleTriggerCommand(command, allowedJobs);
    }
    if (command.type === 'help') {
      return this.handleHelpCommand(command, allowedJobs);
    }

    return 'NOOP';
  }

  private async handleTriggerCommand(
    command: TriggerCommand,
    allowedJobs: string[],
  ): Promise<string> {
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

  private async handleHelpCommand(
    command: HelpCommand,
    allowedJobs: string[],
  ): Promise<string> {
    let comment =
      'You trigger commands by commenting like:\n\n' +
      '```\n' +
      `${this.triggerWord} JOB` +
      '```';

    if (allowedJobs.length > 0) {
      comment +=
        '\n\nAllowed jobs:\n\n' +
        allowedJobs.map(allowedJob => `* ${allowedJob}`).join('\n');
    }

    await this.github.postPullRequestComment(command.pullRequest, comment);

    return `Help`;
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
