import { createOIDCState } from '../src/supertokens-at-home/shared';

test('OIDC state never contains the delimiter the web app appends the integration id with', () => {
  for (let i = 0; i < 2_000; i++) {
    expect(createOIDCState()).not.toContain('--');
  }
});
