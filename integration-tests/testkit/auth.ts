import { z } from 'zod';
import { getServiceHost } from './utils';

const SignUpSignInUserResponseModel = z
  .object({
    status: z.literal('OK'),
    user: z.object({
      emails: z.array(z.string()),
      id: z.string(),
      timeJoined: z.number(),
    }),
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .refine(response => response.user.emails.length === 1)
  .transform(response => ({
    ...response,
    user: {
      id: response.user.id,
      email: response.user.emails[0],
      timeJoined: response.user.timeJoined,
    },
  }));

const signUpUserViaEmail = async (
  email: string,
  password: string,
): Promise<z.TypeOf<typeof SignUpSignInUserResponseModel>> => {
  const apiAddress = await getServiceHost('server', 3001);
  try {
    const response = await fetch(`http://${apiAddress}/auth-api/signup`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'st-auth-mode': 'header',
        'cf-connecting-ip': Math.random().toString().substring(2),
      },
      body: JSON.stringify({
        formFields: [
          {
            id: 'email',
            value: email,
          },
          {
            id: 'password',
            value: password,
          },
          {
            id: 'firstName',
            value: null,
          },
          {
            id: 'lastName',
            value: null,
          },
        ],
      }),
    });
    const body = await response.json();

    if (response.status !== 200 || body.status !== 'OK') {
      throw new Error(`Signup failed. ${response.status}.\n ${JSON.stringify(body)}`);
    }

    return SignUpSignInUserResponseModel.parse({
      ...body,
      accessToken: response.headers.get('st-access-token'),
      refreshToken: response.headers.get('st-refresh-token'),
    });
  } catch (e) {
    console.warn(`Failed to sign up:`, e);

    throw e;
  }
};

const password = 'ilikebigturtlesandicannotlie47';

export function userEmail(userId: string) {
  return `${userId}-${Date.now()}@localhost.localhost`;
}

const tokenResponsePromise: {
  [key: string]: Promise<z.TypeOf<typeof SignUpSignInUserResponseModel>> | null;
} = {};

export function authenticate(email: string): Promise<{ accessToken: string; refreshToken: string }>;
export function authenticate(
  email: string,
  oidcIntegrationId?: string,
): Promise<{ accessToken: string; refreshToken: string }>;
export async function authenticate(
  email: string | string,
  oidcIntegrationId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!tokenResponsePromise[email]) {
    tokenResponsePromise[email] = signUpUserViaEmail(email, password);
  }

  const data = await tokenResponsePromise[email]!;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}
