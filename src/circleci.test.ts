import moxios from 'moxios';
import { BuildResult, triggerBuild } from './circleci';
import { Config } from './config';
import { BuildParameter } from './Github';

describe('circleci', () => {
  describe('#triggerBuild', () => {
    const config: Config = {
      githubAccessToken: 'github-access-token',
      circleApiToken: 'circle-api-token',
      triggerWord: '@triggerbot trigger',
    };

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

    const buildParams: BuildParameter = {
      pullRequest,
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
        const buildResult = await triggerBuild(buildParams, config);
        const expected: BuildResult = {
          buildUrl:
            'https://circleci.com/gh/yuya-takeyama/gh-circle-trigger-proto/14',
        };
        expect(buildResult).toEqual(expected);
      });
    });

    describe('when job is undefined', () => {
      it('rejects with an error', async () => {
        buildParams.job = undefined;
        const error: Error = await triggerBuild(buildParams, config).catch(
          e => e,
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/job is not specified/);
      });
    });
  });
});
