import Circleci from './Circleci';
import { loadConfig } from './config';
import Github, { BuildParameter } from './Github';
import { GithubWebhookEvent } from './interfaces/github';
import { ensureError } from './utils';

const config = loadConfig();
const github = Github.fromConfig(config);
const circleci = Circleci.fromConfig(config);

const postErrorMessageToGithub = (
  buildParam: BuildParameter,
  err: Error,
): void => {
  github.postPullRequestComment(
    buildParam.pullRequest,
    `Failed to trigger a build: ${err.message}`,
  );
};

export default async (event: GithubWebhookEvent): Promise<string> => {
  const buildParam = await github.paraseBuildParameter(event);
  if (buildParam && buildParam.job) {
    const buildResult = await circleci.triggerBuild(buildParam).catch(err => {
      const error = ensureError(err);
      postErrorMessageToGithub(buildParam, err);
      throw error;
    });
    await github.notifyBuildUrl(buildParam.pullRequest, buildResult);
    return `Trigger: ${buildParam.job}, Branch: ${buildParam.branch}`;
  }

  return 'NOOP';
};
