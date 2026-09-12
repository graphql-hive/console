import { MOCK_USER } from '@/dev/mock-user';
import {
  createFrontToken,
  expiredSessionCookies,
  FRONT_TOKEN_COOKIE,
  isMockFrontToken,
  LAST_UPDATE_COOKIE,
  readCookie,
  sessionCookies,
} from './session';

describe('createFrontToken', () => {
  test('is what supertokens-website parses: base64 of { uid, ate, up }', () => {
    const now = 1_700_000_000_000;
    const token = JSON.parse(Buffer.from(createFrontToken(now), 'base64').toString('utf8'));

    expect(token.uid).toBe(MOCK_USER.id);
    expect(token.ate).toBeGreaterThan(now + 365 * 24 * 60 * 60 * 1000);
    expect(token.up).toMatchObject({ superTokensUserId: MOCK_USER.id, email: MOCK_USER.email });
  });
});

describe('isMockFrontToken', () => {
  const encode = (token: unknown) => Buffer.from(JSON.stringify(token)).toString('base64');

  test('accepts an unexpired token this mock minted', () => {
    expect(isMockFrontToken(createFrontToken())).toBe(true);
  });

  test('rejects an expired mock token, so it gets re-planted rather than refreshed', () => {
    const now = 1_700_000_000_000;
    expect(isMockFrontToken(createFrontToken(now), now + 11 * 365 * 24 * 60 * 60 * 1000)).toBe(
      false,
    );
  });

  test('rejects a token from a real login on the same origin', () => {
    expect(isMockFrontToken(encode({ uid: 'real-user', ate: Date.now() + 60_000, up: {} }))).toBe(
      false,
    );
  });

  test('rejects garbage without throwing', () => {
    expect(isMockFrontToken(undefined)).toBe(false);
    expect(isMockFrontToken('')).toBe(false);
    expect(isMockFrontToken('not base64 json')).toBe(false);
    expect(isMockFrontToken(encode('a string'))).toBe(false);
  });
});

describe('sessionCookies', () => {
  test('sets both cookies the session SDK checks, on the whole site, long-lived', () => {
    const cookies = sessionCookies(1_700_000_000_000);

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(new RegExp(`^${FRONT_TOKEN_COOKIE}=[A-Za-z0-9+/=]+; Path=/;`));
    expect(cookies[1]).toMatch(new RegExp(`^${LAST_UPDATE_COOKIE}=1700000000000; Path=/;`));
    for (const cookie of cookies) expect(cookie).toContain('Max-Age=315360000');
  });

  test('the expiring variant clears the same two names', () => {
    const names = expiredSessionCookies().map(c => c.split('=')[0]);

    expect(names).toEqual([FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE]);
    for (const cookie of expiredSessionCookies()) expect(cookie).toContain('Max-Age=0');
  });
});

describe('readCookie', () => {
  test('finds a value in a multi-cookie header', () => {
    const header = 'a=1; hive-mock-scenario=over-quota; sFrontToken=abc==';

    expect(readCookie(header, 'hive-mock-scenario')).toBe('over-quota');
    expect(readCookie(header, 'sFrontToken')).toBe('abc==');
    expect(readCookie(header, 'a')).toBe('1');
  });

  test('does not match a cookie whose name merely starts the same', () => {
    expect(readCookie('sFrontTokenX=1', 'sFrontToken')).toBeUndefined();
  });

  test('handles a missing header and a missing cookie', () => {
    expect(readCookie(undefined, 'a')).toBeUndefined();
    expect(readCookie('b=2', 'a')).toBeUndefined();
  });
});
