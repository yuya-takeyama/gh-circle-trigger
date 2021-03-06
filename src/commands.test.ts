import moxios from 'moxios';
import {
  CommandParser,
  HelpCommand,
  NoopCommand,
  TriggerCommand,
} from './commands';
import { Config } from './config';
import Github from './Github';
import {
  IssueCommentEvent,
  PullRequestEntity,
  PullRequestEvent,
} from './interfaces/github';

describe('Commandparser', () => {
  const config: Config = {
    githubAccessToken: 'github-access-token',
    circleApiToken: 'circle-api-token',
    triggerWord: '@triggerbot',
  };
  const github = Github.fromConfig(config);
  const commandParser = new CommandParser(github, config.triggerWord);

  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('#parse', () => {
    describe('with PullRequestEvent', () => {
      let event: PullRequestEvent;
      beforeEach(() => {
        event = {
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
      });

      describe('trigger command', () => {
        describe('without job name', () => {
          it('returns NoopCommand', async () => {
            const command = await commandParser.parse(event);
            const expected: NoopCommand = { type: 'noop' };
            expect(command).toEqual(expected);
          });
        });

        describe('without job name', () => {
          it('returns TriggerCommand', async () => {
            event.payload.pull_request.body = '@triggerbot trigger build';
            const command = await commandParser.parse(event);
            const expected: TriggerCommand = {
              type: 'trigger',
              branch: 'fix',
              repository: 'yuya-takeyama/gh-circle-trigger-proto',
              pullRequest: event.payload.pull_request,
              job: 'build',
            };
            expect(command).toEqual(expected);
          });
        });

        describe('action is not "opened"', () => {
          it('returns NoopCommand', async () => {
            event.payload.action = 'edited';
            const command = await commandParser.parse(event);
            expect(command).toEqual({ type: 'noop' });
          });
        });
      });

      describe('help command', () => {
        it('returns NoopCommand', async () => {
          event.payload.pull_request.body = '@triggerbot help';
          const command = await commandParser.parse(event);
          const expected: HelpCommand = {
            type: 'help',
            pullRequest: event.payload.pull_request,
          };
          expect(command).toEqual(expected);
        });
      });
    });

    describe('with IssueCommentEvent', () => {
      let event: IssueCommentEvent;
      let pullRequest: PullRequestEntity;

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
        pullRequest = {
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
          status: 200,
          response: pullRequest,
        });
      });

      describe('trigger command', () => {
        describe('without job name', () => {
          it('returns NoopCommand', async () => {
            const command = await commandParser.parse(event);
            const expected: NoopCommand = { type: 'noop' };
            expect(command).toEqual(expected);
          });
        });

        describe('with job name', () => {
          it('returns TriggerCommand', async () => {
            event.payload.comment.body = '@triggerbot trigger build';
            const command = await commandParser.parse(event);
            const expected: TriggerCommand = {
              pullRequest,
              type: 'trigger',
              branch: 'fix',
              repository: 'yuya-takeyama/gh-circle-trigger-proto',
              job: 'build',
            };
            expect(command).toEqual(expected);
          });
        });

        describe('when action is not "created"', () => {
          it('returns NoopCommand', async () => {
            event.payload.action = 'edited';
            const command = await commandParser.parse(event);
            const expected: NoopCommand = { type: 'noop' };
            expect(command).toEqual(expected);
          });
        });
      });

      describe('help command', () => {
        it('returns HelpCommand', async () => {
          event.payload.comment.body = '@triggerbot help';
          const command = await commandParser.parse(event);
          const expected: HelpCommand = {
            type: 'help',
            pullRequest: event.payload.issue.pull_request,
          };
          expect(command).toEqual(expected);
        });
      });
    });
  });
});
