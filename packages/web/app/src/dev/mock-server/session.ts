import { MOCK_USER } from '@/dev/mock-user';

export const FRONT_TOKEN_COOKIE = 'sFrontToken';
export const LAST_UPDATE_COOKIE = 'st-last-access-token-update';

const TEN_YEARS_S = 10 * 365 * 24 * 60 * 60;
const ATTRS = `Path=/; SameSite=Lax; Max-Age=${TEN_YEARS_S}`;

/**
 * The front token supertokens-website reads to decide a session exists, with no network
 * call while `ate` is in the future. Mirrors e2e/helpers/auth.ts createFrontToken.
 */
export function createFrontToken(now = Date.now()): string {
  const up = {
    sub: MOCK_USER.id,
    superTokensUserId: MOCK_USER.id,
    email: MOCK_USER.email,
    iss: 'http://localhost:3000/auth-api',
  };
  return Buffer.from(
    JSON.stringify({ uid: MOCK_USER.id, ate: now + TEN_YEARS_S * 1000, up }),
  ).toString('base64');
}

/**
 * True only for an unexpired token this mock minted. A token left by a real-stack login
 * on the same origin must be replaced: once its `ate` passes, the SDK tries to refresh it
 * against the mock, fails, and shows the sign-in page.
 */
export function isMockFrontToken(raw: string | undefined, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const token = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      uid?: unknown;
      ate?: unknown;
    };
    return token.uid === MOCK_USER.id && typeof token.ate === 'number' && token.ate > now;
  } catch {
    return false;
  }
}

export function sessionCookies(now = Date.now()): string[] {
  return [
    `${FRONT_TOKEN_COOKIE}=${createFrontToken(now)}; ${ATTRS}`,
    `${LAST_UPDATE_COOKIE}=${now}; ${ATTRS}`,
  ];
}

export function expiredSessionCookies(): string[] {
  return [FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE].map(
    name => `${name}=; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
