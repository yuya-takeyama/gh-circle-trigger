import moxios from 'moxios';
import { Config } from './config';
import Handler from './Handler';
import {
  GithubWebhookEvent,
  IssueCommentEvent,
  PullRequestEntity,
  PullRequestEvent,
} from './interfaces/github';

describe('handler', () => {
  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  const config: Config = {
    githubAccessToken: 'github_token',
    circleApiToken: 'circleci_token',
    triggerWord: '@bot',
  };
  const handler = Handler.fromConfig(config);

  describe("when it's PullRequestEvent", () => {
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

    describe('when it contains the trigger word', () => {
      describe('trigger command', () => {
        beforeEach(() => {
          event.payload.pull_request.body = '@bot trigger the_job';
        });

        describe('and it succeeded to trigger the job', () => {
          beforeEach(() => {
            moxios.stubRequest(
              'https://circleci.com/api/v1.1/project/github/yuya-takeyama/gh-circle-trigger-proto/tree/fix',
              {
                status: 201,
                response: { build_url: 'https://circleci.com/build_url' },
              },
            );
            moxios.stubRequest(
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
              { status: 201, response: {} },
            );
          });

          it('returns the triggered job', async () => {
            const result = await handler.handle(event, []);

            expect(result).toEqual('Trigger: the_job, Branch: fix');
          });

          describe('when allowedJobs is not empty', () => {
            describe('and the job is in allowedJobs', async () => {
              it('returns the triggered job', async () => {
                const result = await handler.handle(event, ['the_job']);

                expect(result).toEqual('Trigger: the_job, Branch: fix');
              });
            });

            describe('and the job is not in allowedJobs', async () => {
              it('returns the triggered job', async () => {
                const result = await handler.handle(event, ['not_the_job']);

                expect(result).toEqual('Not allowed: the_job');
              });
            });
          });
        });

        describe('and it failed to trigger the job', () => {
          beforeEach(() => {
            moxios.stubRequest(
              'https://circleci.com/api/v1.1/project/github/yuya-takeyama/gh-circle-trigger-proto/tree/fix',
              {
                status: 403,
                response: { message: 'Forbidden' },
              },
            );
            moxios.stubRequest(
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
              { status: 201, response: {} },
            );
          });

          it('throws an error', async () => {
            const err = await handler.handle(event, []).catch(err => err);

            expect(err.message).toEqual('Request failed with status code 403');
          });
        });
      });

      describe('help command', () => {
        beforeEach(() => {
          event.payload.pull_request.body = '@bot help';
        });

        it('returns "Help"', async () => {
          moxios.stubRequest(event.payload.pull_request.comments_url, {
            status: 201,
            response: {},
          });
          const result = await handler.handle(event, ['allowed_job']);

          expect(result).toEqual('Help');
        });
      });
    });

    describe('when it does not contain trigger word', async () => {
      const result = await handler.handle(event, []);

      expect(result).toEqual('NOOP');
    });
  });

  describe("when it's IssueCommentEvent", () => {
    let event: IssueCommentEvent;

    beforeEach(() => {
      event = {
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
    });

    describe('when it contains the trigger word', () => {
      beforeEach(() => {
        event.payload.comment.body = '@bot trigger the_job';
        const response: PullRequestEntity = {
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
        moxios.stubRequest(event.payload.issue.pull_request.url, {
          response,
          status: 200,
        });
      });

      describe('trigger command', () => {
        describe('and it succeeded to trigger the job', () => {
          beforeEach(() => {
            moxios.stubRequest(
              'https://circleci.com/api/v1.1/project/github/yuya-takeyama/gh-circle-trigger-proto/tree/fix',
              {
                status: 201,
                response: { build_url: 'https://circleci.com/build_url' },
              },
            );
            moxios.stubRequest(
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
              { status: 201, response: {} },
            );
          });

          it('returns the triggered job', async () => {
            const result = await handler.handle(event, []);

            expect(result).toEqual('Trigger: the_job, Branch: fix');
          });

          describe('when allowedJobs is not empty', () => {
            describe('and the job is in allowedJobs', async () => {
              it('returns the triggered job', async () => {
                const result = await handler.handle(event, ['the_job']);

                expect(result).toEqual('Trigger: the_job, Branch: fix');
              });
            });

            describe('and the job is not in allowedJobs', async () => {
              it('returns the triggered job', async () => {
                const result = await handler.handle(event, ['not_the_job']);

                expect(result).toEqual('Not allowed: the_job');
              });
            });
          });
        });

        describe('and it failed to trigger the job', () => {
          beforeEach(() => {
            moxios.stubRequest(
              'https://circleci.com/api/v1.1/project/github/yuya-takeyama/gh-circle-trigger-proto/tree/fix',
              {
                status: 403,
                response: { message: 'Forbidden' },
              },
            );
            moxios.stubRequest(
              'https://api.github.com/repos/yuya-takeyama/gh-circle-trigger-proto/issues/2/comments',
              { status: 201, response: {} },
            );
          });

          it('throws an error', async () => {
            const err = await handler.handle(event, []).catch(err => err);

            expect(err.message).toEqual('Request failed with status code 403');
          });
        });
      });

      describe('help command', () => {
        beforeEach(() => {
          event.payload.comment.body = '@bot help';
        });

        it('returns "Help"', async () => {
          moxios.stubRequest(event.payload.issue.pull_request.comments_url, {
            status: 201,
            response: {},
          });
          const result = await handler.handle(event, []);

          expect(result).toEqual('Help');
        });
      });
    });

    describe('when it does not contain trigger word', () => {
      it('returns NOOP', async () => {
        const result = await handler.handle(event, []);

        expect(result).toEqual('NOOP');
      });
    });
  });

  describe("when it's not a target event", () => {
    const event: GithubWebhookEvent = {
      event: 'unknown',
      payload: {
        action: 'unknown',
      },
    };

    it('returns NOOP', async () => {
      const result = await handler.handle(event, []);

      expect(result).toEqual('NOOP');
    });
  });
});
