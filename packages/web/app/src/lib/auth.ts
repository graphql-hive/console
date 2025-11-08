import { createAuthClient } from 'better-auth/react';
import { env } from '@/env/frontend';

export const authClient = createAuthClient({
  baseURL: env.graphqlPublicOrigin,
  basePath: '/auth-api',
});
