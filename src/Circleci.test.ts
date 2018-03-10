import moxios from 'moxios';
import Circleci, { BuildResult } from './Circleci';
import { TriggerCommand } from './commands';
import { Config } from './config';

describe('Circleci', () => {
  describe('#triggerBuild', () => {
    const config: Config = {
      githubAccessToken: 'github-access-token',
      circleApiToken: 'circle-api-token',
      triggerWord: '@triggerbot trigger',
    };
    const circleci = Circleci.fromConfig(config);

    const pullRequest = {
      url:
        'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/pulls/2',
      id: 172665130,
      body: 'Hello',
      comments_url:
        'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
      head: {
        ref: 'fix',
      },
      base: {
        ref: 'master',
      },
    };

    const command: TriggerCommand = {
      pullRequest,
      type: 'trigger',
      branch: 'fix',
      repository: 'yuya-takeyama/gh-circle-trigger-proto',
      job: 'build',
    };

    beforeEach(() => {
      moxios.install();
    });

    afterEach(() => {
      moxios.uninstall();
    });

    describe('when request succeeded', () => {
      moxios.stubRequest(
        'https://circleci.com/api/v1.1/project/github/yuya-takeyama/gh-circle-trigger-proto/tree/fix',
        {
          status: 200,
          response: {
            build_url:
              'https://circleci.com/gh/yuya-takeyama/gh-circle-trigger-proto/14',
          },
        },
      );

      it('returns BuildResult', async () => {
        const buildResult = await circleci.triggerBuild(command);
        const expected: BuildResult = {
          buildUrl:
            'https://circleci.com/gh/yuya-takeyama/gh-circle-trigger-proto/14',
        };
        expect(buildResult).toEqual(expected);
      });
    });
  });
});
