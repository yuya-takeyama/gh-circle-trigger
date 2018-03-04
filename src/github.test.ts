import moxios from 'moxios';
import { Config } from './config';
import { BuildParameter, paraseBuildParameter, parseTargetJob } from './github';
import { IssueCommentEvent, PullRequestEvent } from './interfaces/github';

describe('github', () => {
  const config: Config = {
    githubAccessToken: 'github-access-token',
    circleApiToken: 'circle-api-token',
    triggerWord: '@triggerbot trigger',
  };

  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('#paraseBuildParameter', () => {
    describe('with PullRequestEvent', () => {
      const event: PullRequestEvent = {
        event: 'pull_request',
        payload: {
          action: 'opened',
          pull_request: {
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
          },
          repository: {
            full_name: 'yuya-takeyama/gh-circle-trigger-proto',
          },
        },
      };

      describe('without job name', () => {
        it('returns BuildParameter', async () => {
          const buildParams = await paraseBuildParameter(event, config);
          const expected: BuildParameter = {
            branch: 'fix',
            repository: 'yuya-takeyama/gh-circle-trigger-proto',
            pullRequest: event.payload.pull_request,
            job: undefined,
          };
          expect(buildParams).toEqual(expected);
        });
      });

      describe('without job name', () => {
        it('returns BuildParameter', async () => {
          event.payload.pull_request.body = '@triggerbot trigger build';
          const buildParams = await paraseBuildParameter(event, config);
          const expected: BuildParameter = {
            branch: 'fix',
            repository: 'yuya-takeyama/gh-circle-trigger-proto',
            pullRequest: event.payload.pull_request,
            job: 'build',
          };
          expect(buildParams).toEqual(expected);
        });
      });

      describe('action is not "opened"', () => {
        it('returns BuildParameter', async () => {
          event.payload.action = 'edited';
          const buildParams = await paraseBuildParameter(event, config);
          expect(buildParams).toBeUndefined();
        });
      });
    });

    describe('with IssueCommentEvent', () => {
      const event: IssueCommentEvent = {
        event: 'issue_comment',
        payload: {
          action: 'created',
          issue: {
            url:
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2',
            comments_url:
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
            pull_request: {
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
            },
          },
          comment: {
            body: 'Hello',
          },
          repository: {
            full_name: 'yuya-takeyama/gh-circle-trigger-proto',
          },
        },
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

      beforeEach(() => {
        moxios.stubRequest(event.payload.issue.pull_request.url, {
          status: 200,
          response: pullRequest,
        });
      });

      describe('without job name', () => {
        it('returns BuildParameter', async () => {
          const buildParams = await paraseBuildParameter(event, config);
          const expected: BuildParameter = {
            pullRequest,
            branch: 'fix',
            repository: 'yuya-takeyama/gh-circle-trigger-proto',
            job: undefined,
          };
          expect(buildParams).toEqual(expected);
        });
      });

      describe('with job name', () => {
        it('returns BuildParameter', async () => {
          event.payload.comment.body = '@triggerbot trigger build';
          const buildParams = await paraseBuildParameter(event, config);
          const expected: BuildParameter = {
            pullRequest,
            branch: 'fix',
            repository: 'yuya-takeyama/gh-circle-trigger-proto',
            job: 'build',
          };
          expect(buildParams).toEqual(expected);
        });
      });

      describe('when action is not "created"', () => {
        it('returns BuildParameter', async () => {
          event.payload.action = 'edited';
          const buildParams = await paraseBuildParameter(event, config);
          expect(buildParams).toBeUndefined();
        });
      });
    });
  });

  describe('#parseTargetJob', () => {
    describe('with trigger word', () => {
      it('returns job name', () => {
        const job = parseTargetJob('@triggerbot trigger build', config);
        expect(job).toEqual('build');
      });
    });

    describe('with extra whitespaces', () => {
      it('returns job name', () => {
        const job = parseTargetJob('   @triggerbot trigger   build   ', config);
        expect(job).toEqual('build');
      });
    });

    describe('with more lines at the beginning', () => {
      it('returns job name', () => {
        const job = parseTargetJob(
          'foo\nbar\n@triggerbot trigger build',
          config,
        );
        expect(job).toEqual('build');
      });
    });
  });
});
