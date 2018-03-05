import Circleci from './Circleci';
import Github, { BuildParameter } from './Github';
import { GithubWebhookEvent } from './interfaces/github';
import { ensureError } from './utils';

export default class Handler {
  private github: Readonly<Github>;
  private circleci: Readonly<Circleci>;

  constructor(github: Github, circleci: Circleci) {
    this.github = github;
    this.circleci = circleci;
  }

  async handle(event: GithubWebhookEvent): Promise<string> {
    const buildParam = await this.github.paraseBuildParameter(event);
    if (buildParam && buildParam.job) {
      const buildResult = await this.circleci
        .triggerBuild(buildParam)
        .catch(async err => {
          const error = ensureError(err);
          await this.postErrorMessageToGithub(buildParam, err);
          throw error;
        });
      await this.github.notifyBuildUrl(buildParam.pullRequest, buildResult);
      return `Trigger: ${buildParam.job}, Branch: ${buildParam.branch}`;
    }

    return 'NOOP';
  }

  private async postErrorMessageToGithub(
    buildParam: BuildParameter,
    err: Error,
  ): Promise<void> {
    try {
      await this.github.postPullRequestComment(
        buildParam.pullRequest,
        `Failed to trigger a build: ${err.message}`,
      );
      return undefined;
    } catch (err) {
      // Don't care if it failed to write comment
      return undefined;
    }
  }
}
