import { isInvalidSignature } from './utils';

describe('utils', () => {
  describe('isInvalidSignature', () => {
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
});
