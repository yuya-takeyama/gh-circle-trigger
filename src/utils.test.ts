import { allowedJobs, isInvalidSignature, parseTargetJob } from './utils';

describe('utils', () => {
  describe('#isInvalidSignature', () => {
    describe('when webhookSecret is not specified', () => {
      it('returns false', () => {
        expect(isInvalidSignature('', undefined, undefined)).toBe(false);
      });
    });

    describe('when webhookSecret is specified', () => {
      describe('and signature matches', () => {
        it('returns false', () => {
          expect(
            isInvalidSignature(
              '{}',
              'sha1=2a36c0d4bb2d1688851b3fe704c7b49af255f243',
              'foo',
            ),
          ).toBe(false);
        });
      });

      describe('and signature is not sent', () => {
        it('returns true', () => {
          expect(isInvalidSignature('{}', undefined, 'foo')).toBe(true);
        });
      });

      describe('and signature does not match', () => {
        it('returns true', () => {
          expect(
            isInvalidSignature(
              '{}',
              'sha1=2a36c0d4bb2d1688851b3fe704c7b49af255f24',
              'foo',
            ),
          ).toBe(true);
        });
      });
    });
  });

  describe('#allowedJobs', () => {
    describe('when both of them are not specified', () => {
      it('returns an empty array', () => {
        expect(allowedJobs(undefined, undefined)).toEqual([]);
      });
    });

    describe('when both of them are specified', () => {
      it('returns an array of fromQuery', () => {
        expect(allowedJobs('a,b,c', 'd,e,f')).toEqual(['d', 'e', 'f']);
      });
    });

    describe('when only fromConfig is specified', () => {
      it('returns an array of fromConfig', () => {
        expect(allowedJobs('a,b,c', undefined)).toEqual(['a', 'b', 'c']);
      });
    });
    describe('when only fromQuery is specified', () => {
      it('returns an array of fromQuery', () => {
        expect(allowedJobs(undefined, 'd,e,f')).toEqual(['d', 'e', 'f']);
      });
    });
  });

  describe('#parseTargetJob', () => {
    describe('with trigger word', () => {
      it('returns job name', () => {
        const job = parseTargetJob(
          '@triggerbot trigger build',
          '@triggerbot trigger',
        );
        expect(job).toEqual('build');
      });
    });

    describe('with extra whitespaces', () => {
      it('returns job name', () => {
        const job = parseTargetJob(
          '   @triggerbot trigger   build   ',
          '@triggerbot trigger',
        );
        expect(job).toEqual('build');
      });
    });

    describe('with more lines at the beginning', () => {
      it('returns job name', () => {
        const job = parseTargetJob(
          'foo\nbar\n@triggerbot trigger build',
          '@triggerbot trigger',
        );
        expect(job).toEqual('build');
      });
    });
  });
});
